
import { useEffect, useState } from 'react';
import './Centers.css';

type Center = {
  id: number;
  code: string;
  name: string;
  project: string;
  active: boolean;
};

const STORAGE_KEY = 'atyieh_kitchen_centers_v1';

function readCenters(): Center[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function Centers() {
  const [centers, setCenters] = useState<Center[]>(readCenters);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [project, setProject] = useState('ورق خودرو چهارمحال');
  const [search, setSearch] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(centers));
  }, [centers]);

  const filteredCenters = centers.filter((center) => {
    const value = search.trim().toLowerCase();

    return (
      center.name.toLowerCase().includes(value) ||
      center.code.toLowerCase().includes(value) ||
      center.project.toLowerCase().includes(value)
    );
  });

  function openNewForm() {
    setEditingId(null);
    setCode('');
    setName('');
    setProject('ورق خودرو چهارمحال');
    setShowForm(true);
  }

  function openEditForm(center: Center) {
    setEditingId(center.id);
    setCode(center.code);
    setName(center.name);
    setProject(center.project);
    setShowForm(true);
  }

  function saveCenter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanCode = code.trim();
    const cleanName = name.trim();
    const cleanProject = project.trim();

    if (!cleanCode || !cleanName || !cleanProject) {
      alert('لطفاً تمام اطلاعات را تکمیل کنید.');
      return;
    }

    const duplicate = centers.some(
      (center) =>
        center.code.toLowerCase() === cleanCode.toLowerCase() &&
        center.id !== editingId
    );

    if (duplicate) {
      alert('این کد مرکز قبلاً ثبت شده است.');
      return;
    }

    if (editingId !== null) {
      setCenters((previous) =>
        previous.map((center) =>
          center.id === editingId
            ? {
                ...center,
                code: cleanCode,
                name: cleanName,
                project: cleanProject,
              }
            : center
        )
      );
    } else {
      const newCenter: Center = {
        id: Date.now(),
        code: cleanCode,
        name: cleanName,
        project: cleanProject,
        active: true,
      };

      setCenters((previous) => [...previous, newCenter]);
    }

    setShowForm(false);
  }

  function toggleCenter(id: number) {
    setCenters((previous) =>
      previous.map((center) =>
        center.id === id
          ? { ...center, active: !center.active }
          : center
      )
    );
  }

  return (
    <div className="centers-page" dir="rtl">
      <div className="centers-header">
        <div>
          <span className="centers-eyebrow">اطلاعات پایه</span>
          <h1>مدیریت مراکز طبخ</h1>
          <p>
            تعریف و مدیریت مراکز طبخ فعال در پروژه‌های شرکت
          </p>
        </div>

        <button className="center-primary-btn" onClick={openNewForm}>
          <span>＋</span>
          افزودن مرکز طبخ
        </button>
      </div>

      <div className="centers-stats">
        <div className="center-stat-card">
          <span>کل مراکز ثبت‌شده</span>
          <strong>{centers.length}</strong>
        </div>

        <div className="center-stat-card">
          <span>مراکز فعال</span>
          <strong>
            {centers.filter((center) => center.active).length}
          </strong>
        </div>

        <div className="center-stat-card">
          <span>مراکز غیرفعال</span>
          <strong>
            {centers.filter((center) => !center.active).length}
          </strong>
        </div>
      </div>

      {showForm && (
        <section className="center-form-panel">
          <div className="center-form-heading">
            <div>
              <h2>
                {editingId !== null
                  ? 'ویرایش مرکز طبخ'
                  : 'ثبت مرکز طبخ جدید'}
              </h2>
              <p>اطلاعات مرکز موردنظر را وارد کنید.</p>
            </div>

            <button
              className="center-close-btn"
              type="button"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>

          <form onSubmit={saveCenter}>
            <div className="center-form-grid">
              <label>
                کد مرکز
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثلاً C001"
                  required
                />
              </label>

              <label>
                نام مرکز طبخ
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="نام مرکز را وارد کنید"
                  required
                />
              </label>

              <label>
                پروژه مرتبط
                <input
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="نام پروژه"
                  required
                />
              </label>
            </div>

            <div className="center-form-actions">
              <button className="center-primary-btn" type="submit">
                {editingId !== null ? 'ذخیره تغییرات' : 'ثبت مرکز'}
              </button>

              <button
                className="center-secondary-btn"
                type="button"
                onClick={() => setShowForm(false)}
              >
                انصراف
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="centers-table-panel">
        <div className="centers-table-heading">
          <div>
            <h2>فهرست مراکز طبخ</h2>
            <p>مراکز تعریف‌شده در سامانه</p>
          </div>

          <input
            className="center-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجوی نام یا کد مرکز..."
          />
        </div>

        <div className="centers-table-wrapper">
          <table className="centers-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>کد مرکز</th>
                <th>نام مرکز طبخ</th>
                <th>پروژه مرتبط</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {filteredCenters.map((center, index) => (
                <tr key={center.id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{center.code}</strong>
                  </td>
                  <td>{center.name}</td>
                  <td>{center.project}</td>
                  <td>
                    <span
                      className={
                        center.active
                          ? 'center-status active'
                          : 'center-status inactive'
                      }
                    >
                      {center.active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>
                    <div className="center-actions">
                      <button
                        className="center-edit-btn"
                        onClick={() => openEditForm(center)}
                      >
                        ویرایش
                      </button>

                      <button
                        className="center-toggle-btn"
                        onClick={() => toggleCenter(center.id)}
                      >
                        {center.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCenters.length === 0 && (
                <tr>
                  <td colSpan={6} className="center-empty">
                    {search
                      ? 'مرکزی با این مشخصات پیدا نشد.'
                      : 'هنوز مرکزی ثبت نشده است. از دکمه افزودن مرکز طبخ استفاده کنید.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Centers;
