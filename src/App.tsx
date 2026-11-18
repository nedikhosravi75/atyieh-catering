
import { useState } from 'react';
import FoodBank from './FoodBank';
import Centers from './Centers';
import MenuPlan from './MenuPlan';
import FoodDistribution from './FoodDistribution';
import './App.css';

const menuItems = [
  { id: 'dashboard', icon: '▦', label: 'داشبورد' },
  { id: 'base', icon: '▤', label: 'اطلاعات پایه' },
  { id: 'menu', icon: '▣', label: 'برنامه غذایی' },
  { id: 'operations', icon: '◷', label: 'عملیات طبخ و توزیع' },
  { id: 'warehouse', icon: '▥', label: 'مدیریت انبار' },
  { id: 'reports', icon: '▧', label: 'گزارش‌ها و تحلیل' },
];

const roleNames: Record<string, string> = {
  manager: 'مدیر شرکت',
  project: 'مدیر پروژه',
  kitchen: 'مسئول مرکز طبخ',
  warehouse: 'انباردار',
  observer: 'ناظر و کنترل‌کننده',
};

function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [role, setRole] = useState('manager');
  const [baseSection, setBaseSection] = useState('foods');

  const activeLabel =
    menuItems.find((item) => item.id === activeMenu)?.label ?? 'داشبورد';

  return (
    <div className="app" dir="rtl">
      <aside className="sidebar">

        {/* لوگو و نام شرکت */}
        <div className="brand">
          <img
            src="/atyieh-logo.png"
            alt="لوگوی آتیه تعاون سپاهان"
            className="brand-logo"
          />

          <div className="brand-text">
            <h2>آتیه</h2>
            <span>تعاون سپاهان</span>
          </div>
        </div>

        <div className="sidebar-caption">منوی اصلی</div>

        <nav className="menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.id)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
              {activeMenu === item.id && <span className="active-line" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>سامانه فعال است</strong>
              <small>نسخه اولیه آزمایشی</small>
            </div>
          </div>

          <div className="sidebar-footer">
            مدیریت عملیات طبخ و توزیع غذا
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>مدیریت عملیات طبخ و توزیع غذا</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activeLabel}</strong>
          </div>

          <div className="topbar-left">
            <div className="project-chip">
              <span className="project-dot" />
              پروژه ورق خودرو چهارمحال
            </div>

            <div className="user-profile">
              <div className="avatar">م</div>

              <div className="user-info">
                <strong>مدیر سامانه</strong>
                <small>{roleNames[role]}</small>
              </div>

              <select
                aria-label="انتخاب نقش نمایشی"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {Object.entries(roleNames).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="content">
          {activeMenu === 'base' ? (
            <div className="base-page">
              <div className="base-tabs">
                <button
                  className={`base-tab ${baseSection === 'foods' ? 'active' : ''}`}
                  onClick={() => setBaseSection('foods')}
                >
                  بانک غذاها
                </button>

                <button
                  className={`base-tab ${baseSection === 'centers' ? 'active' : ''}`}
                  onClick={() => setBaseSection('centers')}
                >
                  مدیریت مراکز طبخ
                </button>
              </div>

              {baseSection === 'foods' ? <FoodBank /> : <Centers />}
            </div>
          ) : activeMenu === 'menu' ? (
            <MenuPlan />
          ) : activeMenu === 'operations' ? (
            <FoodDistribution />
          ) : activeMenu === 'dashboard' ? (
            <>
              <section className="welcome">
                <div>
                  <span className="eyebrow">
                  ATYEH TAAAVON SEPAHAN
                  </span>

                  <h1>مدیریت راهبردی خدمات طبخ و توزیع غذا</h1>

                  <p>
                  <strong>یکپارچگی در تصمیم؛ تعالی در عملکرد</strong>
                    <br />
                  برای یک راه موفقیت تا بی نهایت . . .
                  </p>
                </div>

                
              </section>

              <section className="section-heading">
                <div>
                  <h2>نمای کلی عملیات</h2>
                  <p>خلاصه وضعیت پروژه ورق خودرو چهارمحال</p>
                </div>

                <span className="date-label">دوره جاری · آبان ۱۴۰۵</span>
              </section>

              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>غذاهای برنامه‌ریزی‌شده</span>
                    <span className="stat-icon red">▣</span>
                  </div>
                  <strong>۰</strong>
                  <small>در برنامه غذایی ماه جاری</small>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>پرس توزیع‌شده</span>
                    <span className="stat-icon orange">♨</span>
                  </div>
                  <strong>۰</strong>
                  <small>مجموع پرس ثبت‌شده</small>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>مواد اولیه انبار</span>
                    <span className="stat-icon green">▥</span>
                  </div>
                  <strong>۰</strong>
                  <small>قلم کالای ثبت‌شده</small>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>گزارش‌های نیازمند بررسی</span>
                    <span className="stat-icon blue">▧</span>
                  </div>
                  <strong>۰</strong>
                  <small>مورد در انتظار کنترل</small>
                </div>
              </section>

              <section className="lower-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>دسترسی سریع</h3>
                      <p>انتخاب بخش موردنظر برای شروع فعالیت</p>
                    </div>
                  </div>

                  <div className="quick-actions">
                    {[
                      {
                        id: 'menu',
                        icon: '▣',
                        title: 'برنامه غذایی',
                        desc: 'تنظیم برنامه ماهانه',
                      },
                      {
                        id: 'operations',
                        icon: '◷',
                        title: 'ثبت توزیع غذا',
                        desc: 'ثبت تعداد پرس روزانه',
                      },
                      {
                        id: 'warehouse',
                        icon: '▥',
                        title: 'ورود انبار',
                        desc: 'ثبت ورود مواد اولیه',
                      },
                      {
                        id: 'reports',
                        icon: '▧',
                        title: 'گزارش مصرف',
                        desc: 'بررسی مصرف و موجودی',
                      },
                    ].map((action) => (
                      <button
                        className="quick-action"
                        key={action.id}
                        onClick={() => setActiveMenu(action.id)}
                      >
                        <span className="quick-icon">{action.icon}</span>

                        <span className="quick-text">
                          <strong>{action.title}</strong>
                          <small>{action.desc}</small>
                        </span>

                        <span className="quick-arrow">‹</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel project-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>اطلاعات پروژه فعال</h3>
                      <p>مشخصات محدوده عملیاتی</p>
                    </div>

                    <span className="active-badge">فعال</span>
                  </div>

                  <div className="project-info">
                    <div className="project-info-row">
                      <span>نام پروژه</span>
                      <strong>ورق خودرو چهارمحال</strong>
                    </div>

                    <div className="project-info-row">
                      <span>نوع فعالیت</span>
                      <strong>خدمات غذایی و طبخ</strong>
                    </div>

                    <div className="project-info-row">
                      <span>وضعیت دوره</span>
                      <strong>در حال اجرا</strong>
                    </div>

                    <div className="project-info-row">
                      <span>وضعیت اطلاعات</span>
                      <strong className="muted-value">
                        در انتظار ثبت اولیه
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <footer className="page-footer">
                <span>آتیه؛ برای یک راه موفقیت تا بی‌نهایت</span>
                <span>
                  مدیریت عملیات طبخ و توزیع غذا | نسخه آزمایشی ۰.۱
                </span>
              </footer>
            </>
          ) : (
            <section className="panel">
              <h2>{activeLabel}</h2>
              <p>این بخش در مراحل بعدی توسعه داده خواهد شد.</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
