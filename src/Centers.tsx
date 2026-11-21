
import { useEffect, useState, type FormEvent } from 'react';
import './Centers.css';

const API_URL = 'https://atyieh-food-api-v2.weblines.ir';

type Project = {
  id: number | string;
  project_code: string;
  project_name: string;
};

type ApiCenter = {
  id: number | string;
  project_id: number | string;
  center_code: string;
  center_name: string;
  address: string | null;
  is_active: boolean;
};

type Center = {
  id: number | string;
  projectId: number | string;
  code: string;
  name: string;
  project: string;
  address: string;
  active: boolean;
};

function Centers() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('1');
  const [centers, setCenters] = useState<Center[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [search, setSearch] = useState('');

  async function loadProjects() {
    const response = await fetch(`${API_URL}/api/projects`);

    if (!response.ok) {
      throw new Error('دریافت فهرست پروژه‌ها ناموفق بود.');
    }

    const data = await response.json();

    const allowedProjects: Project[] = (data.projects || data).filter(
      (project: Project) =>
        ['1', '2'].includes(String(project.id))
    );

    setProjects(allowedProjects);
  }

  async function loadCenters(projectId: string) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/centers`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'دریافت مراکز ناموفق بود.');
      }

      const projectName =
        projects.find((p) => String(p.id) === projectId)?.project_name || '';

      const mappedCenters: Center[] = (data.centers || []).map(
        (center: ApiCenter) => ({
          id: center.id,
          projectId: center.project_id,
          code: center.center_code,
          name: center.center_name,
          project: projectName,
          address: center.address || '',
          active: center.is_active,
        })
      );

      setCenters(mappedCenters);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در دریافت اطلاعات مراکز'
      );
    } finally {
      setLoading(false);
    }
  }
console.log('CENTERS COMPONENT LOADED');
  useEffect(() => {
    async function initialize() {
      try {
        setError('');
        const response = await fetch(`${API_URL}/api/projects`);

        if (!response.ok) {
          throw new Error('دریافت پروژه‌ها ناموفق بود.');
        }

        const data = await response.json();

        const allowedProjects: Project[] = (data.projects || data).filter(
          (project: Project) =>
            ['1', '2'].includes(String(project.id))
        );

        setProjects(allowedProjects);

        if (allowedProjects.length > 0) {
          const firstProjectId = String(allowedProjects[0].id);
          setSelectedProjectId(firstProjectId);

          const centersResponse = await fetch(
            `${API_URL}/api/projects/${firstProjectId}/centers`
          );

          const centersData = await centersResponse.json();

          if (!centersResponse.ok) {
            throw new Error(
              centersData.message || 'دریافت مراکز ناموفق بود.'
            );
          }

          setCenters(
            (centersData.centers || []).map((center: ApiCenter) => ({
              id: center.id,
              projectId: center.project_id,
              code: center.center_code,
              name: center.center_name,
              project:
                allowedProjects.find(
                  (p) => String(p.id) === firstProjectId
                )?.project_name || '',
              address: center.address || '',
              active: center.is_active,
            }))
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'خطا در ارتباط با سرور'
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    setShowForm(false);
    setEditingId(null);
    await loadCenters(projectId);
  }

  function resetForm() {
    setCode('');
    setName('');
    setAddress('');
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(center: Center) {
    setEditingId(center.id);
    setCode(center.code);
    setName(center.name);
    setAddress(center.address);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!code.trim() || !name.trim()) {
      setError('کد مرکز و نام مرکز الزامی است.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const isEditing = editingId !== null;

      const url = isEditing
        ? `${API_URL}/api/centers/${editingId}`
        : `${API_URL}/api/projects/${selectedProjectId}/centers`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center_code: code.trim(),
          center_name: name.trim(),
          address: address.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (response.status === 409
              ? 'این کد مرکز قبلاً ثبت شده است.'
              : 'ذخیره اطلاعات ناموفق بود.')
        );
      }

      resetForm();
      await loadCenters(selectedProjectId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در ذخیره اطلاعات'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(center: Center) {
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/api/centers/${center.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_active: !center.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'تغییر وضعیت مرکز ناموفق بود.');
      }

      await loadCenters(selectedProjectId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در تغییر وضعیت'
      );
    }
  }

  const filteredCenters = centers.filter((center) => {
    const term = search.trim().toLowerCase();

    return (
      center.name.toLowerCase().includes(term) ||
      center.code.toLowerCase().includes(term)
    );
  });

  const activeCount = centers.filter((center) => center.active).length;
  const inactiveCount = centers.length - activeCount;

  return (
    <div className="centers-page">
      <h1 style={{ color: 'red', fontSize: '30px' }}>
  صفحه مدیریت مراکز اجرا شد
</h1>
      <div className="centers-header">
        <div>
          <h2>مدیریت مراکز</h2>
          <p>مدیریت مراکز طبخ و توزیع غذا</p>
        </div>

        <button
          className="center-primary-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          افزودن مرکز جدید
        </button>
      </div>

      {error && (
        <div className="center-error">
          {error}
        </div>
      )}

      <div className="centers-project-filter">
        <label htmlFor="project-select">انتخاب پروژه:</label>
        <select
          id="project-select"
          value={selectedProjectId}
          onChange={(e) => handleProjectChange(e.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={String(project.id)}>
              {project.project_name}
            </option>
          ))}
        </select>
      </div>

      <div className="centers-stats">
        <div className="center-stat-card">
          <span>کل مراکز</span>
          <strong>{centers.length}</strong>
        </div>
        <div className="center-stat-card">
          <span>مراکز فعال</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="center-stat-card">
          <span>مراکز غیرفعال</span>
          <strong>{inactiveCount}</strong>
        </div>
      </div>

      {showForm && (
        <div className="center-form-panel">
          <div className="center-form-heading">
            <h3>
              {editingId !== null ? 'ویرایش مرکز' : 'ثبت مرکز جدید'}
            </h3>
            <button
              type="button"
              className="center-close-btn"
              onClick={resetForm}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="center-form-grid">
              <div>
                <label>پروژه</label>
                <input
                  value={
                    projects.find(
                      (p) => String(p.id) === selectedProjectId
                    )?.project_name || ''
                  }
                  disabled
                />
              </div>

              <div>
                <label>کد مرکز</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثلاً CTR-003"
                  required
                />
              </div>

              <div>
                <label>نام مرکز</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="نام کامل مرکز"
                  required
                />
              </div>

              <div>
                <label>نشانی</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="نشانی مرکز"
                />
              </div>
            </div>

            <div className="center-form-actions">
              <button
                type="submit"
                className="center-primary-btn"
                disabled={saving}
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
              </button>

              <button
                type="button"
                className="center-secondary-btn"
                onClick={resetForm}
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="centers-table-panel">
        <div className="centers-table-heading">
          <h3>فهرست مراکز</h3>

          <input
            className="center-search"
            placeholder="جستجوی مرکز..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="centers-table-wrapper">
          <table className="centers-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>کد مرکز</th>
                <th>نام مرکز</th>
                <th>پروژه</th>
                <th>نشانی</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>در حال دریافت اطلاعات...</td>
                </tr>
              ) : filteredCenters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="center-empty">
                    مرکزی برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : (
                filteredCenters.map((center, index) => (
                  <tr key={center.id}>
                    <td>{index + 1}</td>
                    <td>{center.code}</td>
                    <td>{center.name}</td>
                    <td>{center.project}</td>
                    <td>{center.address || '—'}</td>
                    <td>
                      <span
                        className={`center-status ${
                          center.active ? 'active' : 'inactive'
                        }`}
                      >
                        {center.active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td>
                      <div className="center-actions">
                        <button
                          className="center-edit-btn"
                          onClick={() => startEdit(center)}
                        >
                          ویرایش
                        </button>
                        <button
                          className="center-toggle-btn"
                          onClick={() => toggleStatus(center)}
                        >
                          {center.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Centers;
