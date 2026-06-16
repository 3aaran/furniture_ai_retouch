import * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

let smsClient = null;

function getSmsConfig() {
  const accessKeyId = String(process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = String(process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '').trim();
  const signName = String(process.env.ALIYUN_SMS_SIGN_NAME || '').trim();
  const templateCode = String(process.env.ALIYUN_SMS_TEMPLATE_CODE || '').trim();

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    throw new Error('阿里云短信配置不完整，请检查后端 .env');
  }

  return { accessKeyId, accessKeySecret, signName, templateCode };
}

function getClient(accessKeyId, accessKeySecret) {
  if (smsClient) return smsClient;
  const config = new $OpenApi.Config({ accessKeyId, accessKeySecret });
  config.endpoint = 'dysmsapi.aliyuncs.com';
  const SmsClient = $Dysmsapi20170525.default?.default || $Dysmsapi20170525.default;
  smsClient = new SmsClient(config);
  return smsClient;
}

export async function sendSmsCode(phone, code) {
  const { accessKeyId, accessKeySecret, signName, templateCode } = getSmsConfig();
  const client = getClient(accessKeyId, accessKeySecret);
  const request = new $Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: phone,
    signName,
    templateCode,
    templateParam: JSON.stringify({ code })
  });

  const response = await client.sendSms(request);
  const body = response?.body || {};
  if (body.code !== 'OK') {
    console.error('[aliyun-sms] send failed', {
      phone,
      requestId: body.requestId,
      code: body.code,
      message: body.message
    });
    throw new Error(body.message || '短信发送失败');
  }
  return body;
}
