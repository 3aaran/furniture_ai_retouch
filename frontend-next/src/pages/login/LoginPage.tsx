import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { PwaInstallButton } from '../../components/pwa/PwaInstallButton';
import { Button } from '../../components/ui/Button';
import { BRAND } from '../../config/brand';
import {
  codeLogin,
  login,
  sendSmsCode,
  submitMerchantApplication,
  verifySmsCode,
} from '../../services/auth.api';
import { saveAuthSession } from '../../stores/auth.store';
import './LoginPage.css';

type AuthMode = 'login' | 'apply';
type LoginType = 'password' | 'sms';
type CountdownState = { login: number; apply: number };

type LoginPageProps = {
  initialMode?: AuthMode;
};

const PHONE_RE = /^1[3-9]\d{9}$/;

const navItems = [
  { href: '/#capabilities', label: '能力' },
  { href: '/#workflow', label: '流程' },
  { href: '/#scenes', label: '场景' },
  { href: '/#plans', label: '套餐' },
];

const initialForm = {
  identifier: '',
  password: '',
  loginCode: '',
  companyName: '',
  contactName: '',
  phone: '',
  applyCode: '',
  inviteCode: '',
  note: '',
};

function cleanCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function LoginPage({ initialMode = 'login' }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginType, setLoginType] = useState<LoginType>('password');
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState<CountdownState>({ login: 0, apply: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = BRAND.name;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteCode = (params.get('invite') || params.get('ref') || params.get('inviteCode') || '').trim();
    const nextMode = initialMode === 'apply' || location.pathname.toLowerCase().includes('register') || location.pathname.toLowerCase().includes('apply') ? 'apply' : 'login';
    setMode(nextMode);
    if (inviteCode) setForm((current) => ({ ...current, inviteCode }));
  }, [initialMode, location.pathname, location.search]);

  useEffect(() => {
    if (!countdown.login && !countdown.apply) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((current) => ({
        login: Math.max(0, current.login - 1),
        apply: Math.max(0, current.apply - 1),
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown.login, countdown.apply]);

  function setField(key: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function switchMode(nextMode: AuthMode) {
    setMessage('');
    setMode(nextMode);
    navigate(nextMode === 'apply' ? '/register' : '/login', { replace: false });
  }

  async function handleSendCode(kind: keyof CountdownState) {
    const isApply = kind === 'apply';
    const phone = String(isApply ? form.phone : form.identifier).trim();
    if (!PHONE_RE.test(phone)) {
      setMessage('请输入正确手机号');
      return;
    }
    if (countdown[kind] > 0) return;

    try {
      setMessage('');
      await sendSmsCode({ phone, scene: isApply ? 'APPLICATION' : 'LOGIN' });
      setCountdown((current) => ({ ...current, [kind]: 60 }));
      setMessage('验证码已发送');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '短信发送失败');
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = form.identifier.trim();
    if (!identifier) {
      setMessage(loginType === 'sms' ? '请输入手机号' : '请输入账号或手机号');
      return;
    }
    if (loginType === 'password' && !form.password) {
      setMessage('请输入密码');
      return;
    }
    if (loginType === 'sms' && !/^\d{6}$/.test(form.loginCode)) {
      setMessage('请输入 6 位短信验证码');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const result = loginType === 'sms'
        ? await codeLogin({ phone: identifier, code: form.loginCode })
        : await login({ account: identifier, password: form.password });
      saveAuthSession(result);
      const role = String(result.user.role || '').trim().toUpperCase();
      navigate(role === 'SYSTEM_ADMIN' || role === 'PLATFORM_ADMIN' ? '/admin/dashboard' : '/studio', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = form.phone.trim();
    if (!form.companyName.trim()) {
      setMessage('请输入商家名称');
      return;
    }
    if (!form.contactName.trim()) {
      setMessage('请输入联系人');
      return;
    }
    if (!PHONE_RE.test(phone)) {
      setMessage('请输入正确手机号');
      return;
    }
    if (!/^\d{6}$/.test(form.applyCode)) {
      setMessage('请输入 6 位短信验证码');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const verified = await verifySmsCode({ phone, code: form.applyCode, scene: 'APPLICATION' });
      await submitMerchantApplication({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        phone,
        inviteCode: form.inviteCode.trim(),
        note: form.note.trim(),
        smsToken: verified.smsToken,
      });
      setMessage('申请已提交，请等待管理员审核');
      setLoginType('password');
      setMode('login');
      navigate('/login', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '申请提交失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="appRoot authShellNext">
      <header className="authTopbarNext">
        <Link to="/" className="authBrandLinkNext" aria-label="返回勋港首页">
          <BrandLogo />
        </Link>
        <nav className="authNavNext" aria-label="登录页导航">
          {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="authTopActionsNext">
          <PwaInstallButton className="authInstallBtnNext" />
          <button className="authTextLinkNext" type="button" onClick={() => switchMode(mode === 'login' ? 'apply' : 'login')}>{mode === 'login' ? '注册' : '登录'}</button>
          <Link to="/studio"><Button>进入工作台</Button></Link>
        </div>
      </header>

      <main className="authPageV2">
        <div className="authAmbient authAmbientOne" />
        <div className="authAmbient authAmbientTwo" />

        <section className="authIntroV2">
          <Link to="/" className="authBrandV2" aria-label="返回首页">
            <BrandLogo />
          </Link>
          <div className="authTitleV2">
            <span>为家具门店打造的 AI 修图工作台</span>
            <h1>{BRAND.name}</h1>
            <p>登录后即可上传真实图片，接入后端资源库、AI 任务和额度体系。</p>
          </div>
          <div className="authStatsV2" aria-label="平台能力摘要">
            <div><b>4K</b><span>高清成图规格</span></div>
            <div><b>门店</b><span>多人协作管理</span></div>
            <div><b>资源库</b><span>素材沉淀复用</span></div>
          </div>
        </section>

        <section className="authCardV2">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="authCardHeadV2">
                <span><i aria-hidden="true">人</i>欢迎回来</span>
                <h2>登录账号</h2>
              </div>

              <div className="authTabsV2" role="tablist" aria-label="登录方式">
                <button type="button" className={loginType === 'password' ? 'on' : ''} onClick={() => setLoginType('password')}>账号密码</button>
                <button type="button" className={loginType === 'sms' ? 'on' : ''} onClick={() => setLoginType('sms')}>手机验证码</button>
              </div>

              <label className="authFieldV2">
                {loginType === 'sms' ? '手机号' : '账号 / 手机号'}
                <input value={form.identifier} onChange={(event) => setField('identifier', loginType === 'sms' ? cleanPhone(event.target.value) : event.target.value)} placeholder={loginType === 'sms' ? '请输入手机号' : '请输入账号或手机号'} autoComplete="username" />
              </label>

              {loginType === 'password' ? (
                <label className="authFieldV2">
                  密码
                  <input type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} placeholder="请输入密码" autoComplete="current-password" />
                </label>
              ) : (
                <label className="authFieldV2">
                  短信验证码
                  <div className="authCodeRowV2">
                    <input value={form.loginCode} onChange={(event) => setField('loginCode', cleanCode(event.target.value))} placeholder="请输入 6 位验证码" inputMode="numeric" />
                    <button type="button" onClick={() => void handleSendCode('login')} disabled={countdown.login > 0}>{countdown.login > 0 ? `${countdown.login}s` : '发送验证码'}</button>
                  </div>
                </label>
              )}

              <button className="authSubmitV2" type="submit" disabled={loading}>{loading ? '处理中...' : '登录'}<span aria-hidden="true">→</span></button>
              <div className="authSwitchV2">没有门店？<button type="button" onClick={() => switchMode('apply')}>提交商家申请</button></div>
            </form>
          ) : (
            <form onSubmit={handleApplySubmit}>
              <div className="authCardHeadV2">
                <div className="authHeadRowV2">
                  <span><i aria-hidden="true">店</i>入驻申请</span>
                  <button type="button" className="authBackBtnV2" onClick={() => switchMode('login')}><span aria-hidden="true">←</span>返回登录</button>
                </div>
              </div>

              <div className="authApplyGridV2">
                <label className="authFieldV2">商家名称<input value={form.companyName} onChange={(event) => setField('companyName', event.target.value)} /></label>
                <label className="authFieldV2">联系人<input value={form.contactName} onChange={(event) => setField('contactName', event.target.value)} /></label>
                <label className="authFieldV2">联系人手机号<input value={form.phone} onChange={(event) => setField('phone', cleanPhone(event.target.value))} inputMode="numeric" /></label>
                <label className="authFieldV2">邀请码<input value={form.inviteCode} onChange={(event) => setField('inviteCode', event.target.value)} /></label>
              </div>

              <label className="authFieldV2">
                短信验证码
                <div className="authCodeRowV2">
                  <input value={form.applyCode} onChange={(event) => setField('applyCode', cleanCode(event.target.value))} placeholder="请输入 6 位验证码" inputMode="numeric" />
                  <button type="button" onClick={() => void handleSendCode('apply')} disabled={countdown.apply > 0}>{countdown.apply > 0 ? `${countdown.apply}s` : '发送验证码'}</button>
                </div>
              </label>
              <label className="authFieldV2">申请说明<textarea value={form.note} onChange={(event) => setField('note', event.target.value)} /></label>
              <button className="authSubmitV2" type="submit" disabled={loading}>{loading ? '处理中...' : '提交申请'}<span aria-hidden="true">→</span></button>
            </form>
          )}

          {message && <div className="authMsgV2" role="status">{message}</div>}
        </section>
      </main>
      <footer className="authMobileFooterNext">
        <span>© 2026 勋港。保留所有权利。</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">粤ICP备2026071107号</a>
        <span>审核通过日期：2026-06-04</span>
      </footer>
    </div>
  );
}
