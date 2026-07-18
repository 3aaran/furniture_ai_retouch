// 中文说明：统一识别非公网 IP，并在服务端请求前校验 URL 与全部 DNS 解析结果。
import { lookup as dnsLookup } from 'node:dns/promises';
import net from 'node:net';

function normalizeHost(hostname) {
  const value = String(hostname || '').trim().toLowerCase();
  const unwrapped = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  return unwrapped.endsWith('.') ? unwrapped.slice(0, -1) : unwrapped;
}

function parseIpv4(value) {
  const parts = String(value || '').split('.');
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => Number(part));
  if (bytes.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return bytes;
}

function parseIpv6(value) {
  let source = normalizeHost(value).split('%')[0];
  if (!source || source.split('::').length > 2) return null;
  if (source.includes('.')) {
    const lastColon = source.lastIndexOf(':');
    const ipv4 = parseIpv4(source.slice(lastColon + 1));
    if (!ipv4) return null;
    source = `${source.slice(0, lastColon)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }
  const [leftSource, rightSource = ''] = source.split('::');
  const left = leftSource ? leftSource.split(':') : [];
  const right = rightSource ? rightSource.split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((source.includes('::') && missing < 1) || (!source.includes('::') && missing !== 0)) return null;
  const groups = [...left, ...Array(Math.max(0, missing)).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((part) => !/^[0-9a-f]{1,4}$/i.test(part))) return null;
  return groups.map((part) => Number.parseInt(part, 16));
}

function isNonPublicIpv4Bytes(bytes) {
  const [a, b, c] = bytes;
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function embeddedIpv4(groups) {
  const mapped = groups.slice(0, 5).every((part) => part === 0) && groups[5] === 0xffff;
  const compatible = groups.slice(0, 6).every((part) => part === 0);
  if (!mapped && !compatible) return null;
  return [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff];
}

export function isNonPublicIpAddress(address) {
  const host = normalizeHost(address);
  const family = net.isIP(host);
  if (family === 4) return isNonPublicIpv4Bytes(parseIpv4(host));
  if (family !== 6) return false;
  const groups = parseIpv6(host);
  if (!groups) return true;
  const embedded = embeddedIpv4(groups);
  if (embedded) return isNonPublicIpv4Bytes(embedded);
  const allZero = groups.every((part) => part === 0);
  const loopback = groups.slice(0, 7).every((part) => part === 0) && groups[7] === 1;
  const first = groups[0];
  return (
    allZero ||
    loopback ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xffc0) === 0xfec0 ||
    (first & 0xff00) === 0xff00 ||
    (first === 0x0100 && groups.slice(1, 4).every((part) => part === 0)) ||
    (first === 0x2001 && groups[1] === 0x0db8) ||
    (first === 0x2001 && groups[1] === 0x0002) ||
    (first & 0xfff0) === 0x3ff0
  );
}

export function assertPublicHttpUrlLiteral(value, label = 'URL') {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch {
    throw new Error(`${label}必须是公网 http/https URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error(`${label}必须是公网 http/https URL`);
  }
  const host = normalizeHost(parsed.hostname);
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error(`${label}必须是公网 http/https URL`);
  }
  if (net.isIP(host) && isNonPublicIpAddress(host)) {
    throw new Error(`${label}必须是公网 http/https URL`);
  }
  return parsed;
}

export async function assertPublicResolvedUrl(value, options = {}) {
  const label = options.label || '远程 URL';
  const parsed = assertPublicHttpUrlLiteral(value, label);
  const host = normalizeHost(parsed.hostname);
  if (net.isIP(host)) return parsed;
  const resolveHost = options.resolveHost || ((hostname) => dnsLookup(hostname, { all: true, verbatim: true }));
  let records;
  try {
    records = await resolveHost(host, { all: true, verbatim: true });
  } catch (error) {
    throw new Error(`${label} DNS 解析失败: ${String(error?.message || error)}`);
  }
  const entries = Array.isArray(records) ? records : [records];
  const addresses = entries.map((entry) => typeof entry === 'string' ? entry : entry?.address).filter(Boolean);
  if (addresses.length === 0 || addresses.some((address) => !net.isIP(normalizeHost(address)) || isNonPublicIpAddress(address))) {
    throw new Error(`${label}解析到非公网地址`);
  }
  return parsed;
}
