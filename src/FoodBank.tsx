
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import * as XLSX from 'xlsx';
import './FoodBank.css';

type Food = {
  code: string;
  name: string;
  group: string;
  subgroup: string;
  active: boolean;
};

type FoodBanks = Record<string, Food[]>;

const STORAGE_KEY = 'atyieh_food_banks_by_project_v1';
const OLD_STORAGE_KEY = 'atyieh_food_bank_v1';
const CENTERS_STORAGE_KEY = 'atyieh_kitchen_centers_v1';
const DEFAULT_PROJECT = 'ورق خودرو چهارمحال';

const defaultGroups = [
  'انواع کباب',
  'انواع خورشت',
  'گوشت سفید',
  'گوشت قرمز',
  'غذاهای پلویی',
  'غذاهای سنتی',
  'غذاهای گیاهی',
  'ماکارونی و پاستا',
  'سوپ و آش',
  'صبحانه',
  'پیش‌غذا',
  'دورچین',
  'سالاد',
  'دسر و میان‌وعده',
  'غذای کمکی / پوره',
];

const normalize = (value: unknown) =>
  String(value ?? '').trim().replace(/\s+/g, ' ');

function normalizeFood(food: any): Food {
  return {
    code: normalize(food.code),
    name: normalize(food.name),
    group: normalize(food.group),
    subgroup: normalize(food.subgroup),
    active: food.active !== false,
  };
}

// خواندن بانک‌های غذای پروژه‌ها و انتقال خودکار اطلاعات قدیمی
function readFoodBanks(): FoodBanks {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: FoodBanks = {};

        Object.entries(parsed).forEach(([project, foods]) => {
          if (Array.isArray(foods)) {
            result[normalize(project)] = foods.map(normalizeFood);
          }
        });

        if (!result[DEFAULT_PROJECT]) {
          result[DEFAULT_PROJECT] = [];
        }

        return result;
      }
    }

    // انتقال بانک غذای قبلی به پروژه ورق خودرو
    const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);

    if (oldSaved) {
      const oldFoods = JSON.parse(oldSaved);

      if (Array.isArray(oldFoods)) {
        return {
          [DEFAULT_PROJECT]: oldFoods.map(normalizeFood),
        };
      }
    }

    return { [DEFAULT_PROJECT]: [] };
  } catch {
    return { [DEFAULT_PROJECT]: [] };
  }
}

// دریافت نام پروژه‌ها از مراکز طبخ ثبت‌شده
function readCenterProjects(): string[] {
  try {
    const saved = localStorage.getItem(CENTERS_STORAGE_KEY);

    if (!saved) return [];

    const centers = JSON.parse(saved);

    if (!Array.isArray(centers)) return [];

    return centers
      .map((center) => normalize(center.project))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function FoodBank() {
  const [banks, setBanks] = useState<FoodBanks>(readFoodBanks);
  const [centerProjects] = useState<string[]>(readCenterProjects);
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('همه گروه‌ها');
  const [subgroupFilter, setSubgroupFilter] = useState('همه زیرگروه‌ها');
  const [statusFilter, setStatusFilter] = useState('فعال');

  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    group: '',
    subgroup: '',
  });

  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ذخیره بانک غذاها به تفکیک پروژه
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(banks));
    } catch {
      setMessage('ذخیره اطلاعات با مشکل مواجه شد.');
    }
  }, [banks]);

  // پروژه‌های قابل انتخاب
  const projects = useMemo(() => {
    return [...new Set([
      DEFAULT_PROJECT,
      ...Object.keys(banks),
      ...centerProjects,
    ])].filter(Boolean).sort((a, b) => {
      if (a === DEFAULT_PROJECT) return -1;
      if (b === DEFAULT_PROJECT) return 1;
      return a.localeCompare(b, 'fa');
    });
  }, [banks, centerProjects]);

  // غذاهای پروژه انتخاب‌شده
  const foods = banks[selectedProject] || [];

  // به‌روزرسانی بانک فقط برای پروژه انتخاب‌شده
  function updateFoods(updater: (previous: Food[]) => Food[]) {
    setBanks((previous) => ({
      ...previous,
      [selectedProject]: updater(previous[selectedProject] || []),
    }));
  }

  // تغییر پروژه
  function handleProjectChange(project: string) {
    setSelectedProject(project);
    setSearch('');
    setGroupFilter('همه گروه‌ها');
    setSubgroupFilter('همه زیرگروه‌ها');
    setStatusFilter('فعال');
    setShowForm(false);
    setEditingCode(null);
    setMessage('');
  }

  const groups = useMemo(() => {
    return [
      ...new Set([
        ...defaultGroups,
        ...foods.map((food) => food.group),
      ]),
    ].filter(Boolean);
  }, [foods]);

  const subgroups = useMemo(() => {
    const result = foods
      .filter(
        (food) =>
          groupFilter === 'همه گروه‌ها' ||
          food.group === groupFilter
      )
      .map((food) => food.subgroup)
      .filter(Boolean);

    return [...new Set(result)].sort((a, b) =>
      a.localeCompare(b, 'fa')
    );
  }, [foods, groupFilter]);

  const formSubgroups = useMemo(() => {
    return [
      ...new Set(
        foods
          .filter((food) => food.group === form.group)
          .map((food) => food.subgroup)
          .filter(Boolean)
      ),
    ];
  }, [foods, form.group]);

  const activeCount = foods.filter((food) => food.active).length;

  const filteredFoods = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return foods.filter((food) => {
      const matchesSearch =
        food.code.toLowerCase().includes(searchValue) ||
        food.name.toLowerCase().includes(searchValue);

      const matchesGroup =
        groupFilter === 'همه گروه‌ها' ||
        food.group === groupFilter;

      const matchesSubgroup =
        subgroupFilter === 'همه زیرگروه‌ها' ||
        food.subgroup === subgroupFilter;

      const matchesStatus =
        statusFilter === 'همه' ||
        (statusFilter === 'فعال' && food.active) ||
        (statusFilter === 'غیرفعال' && !food.active);

      return (
        matchesSearch &&
        matchesGroup &&
        matchesSubgroup &&
        matchesStatus
      );
    });
  }, [foods, search, groupFilter, subgroupFilter, statusFilter]);

  function resetFilters() {
    setSearch('');
    setGroupFilter('همه گروه‌ها');
    setSubgroupFilter('همه زیرگروه‌ها');
    setStatusFilter('فعال');
  }

  function handleGroupFilter(value: string) {
    setGroupFilter(value);
    setSubgroupFilter('همه زیرگروه‌ها');
  }

  function openNewForm() {
    setEditingCode(null);

    setForm({
      code: '',
      name: '',
      group: '',
      subgroup: '',
    });

    setMessage('');
    setShowForm(true);
  }

  function openEditForm(food: Food) {
    setEditingCode(food.code);

    setForm({
      code: food.code,
      name: food.name,
      group: food.group,
      subgroup: food.subgroup,
    });

    setMessage('');
    setShowForm(true);
  }

  function saveFood(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const code = normalize(form.code);
    const name = normalize(form.name);
    const group = normalize(form.group);
    const subgroup = normalize(form.subgroup);

    if (!code || !name || !group) {
      setMessage('کد، نام و گروه اصلی غذا الزامی است.');
      return;
    }

    const duplicate = foods.some(
      (food) =>
        food.code === code &&
        food.code !== editingCode
    );

    if (duplicate) {
      setMessage('این کد غذا در بانک همین پروژه قبلاً ثبت شده است.');
      return;
    }

    if (editingCode) {
      updateFoods((previous) =>
        previous.map((food) =>
          food.code === editingCode
            ? {
                ...food,
                code,
                name,
                group,
                subgroup,
              }
            : food
        )
      );

      setMessage('اطلاعات غذا با موفقیت ویرایش شد.');
    } else {
      updateFoods((previous) => [
        ...previous,
        {
          code,
          name,
          group,
          subgroup,
          active: true,
        },
      ]);

      setMessage('غذای جدید با موفقیت ثبت شد.');
    }

    setShowForm(false);
  }

  function toggleFood(food: Food) {
    const action = food.active ? 'غیرفعال' : 'فعال';

    const confirmed = window.confirm(
      `غذا «${food.name}» در پروژه «${selectedProject}» ${action} شود؟`
    );

    if (!confirmed) return;

    updateFoods((previous) =>
      previous.map((item) =>
        item.code === food.code
          ? { ...item, active: !item.active }
          : item
      )
    );

    setMessage(`وضعیت غذای ${food.name} تغییر کرد.`);
  }

  function findValue(
    row: Record<string, unknown>,
    possibleNames: string[]
  ) {
    const normalizedNames = possibleNames.map(normalize);

    const key = Object.keys(row).find((item) =>
      normalizedNames.includes(normalize(item))
    );

    return key ? normalize(row[key]) : '';
  }

  async function importExcel(file?: File) {
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: 'array',
      });

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      if (!sheet) {
        setMessage('فایل Excel فاقد برگه اطلاعات است.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet,
        { defval: '' }
      );

      const imported: Food[] = [];
      const seen = new Set<string>();
      const errors: string[] = [];

      rows.forEach((row, index) => {
        const code = findValue(row, ['کد غذا', 'کد']);
        const name = findValue(row, ['نام غذا', 'نام']);
        const group = findValue(row, ['گروه اصلی', 'گروه']);
        const subgroup = findValue(row, ['زیرگروه', 'زیر گروه']);

        if (!code && !name && !group && !subgroup) return;

        if (!code || !name || !group) {
          errors.push(`ردیف ${index + 2}: اطلاعات ضروری ناقص است.`);
          return;
        }

        if (seen.has(code)) {
          errors.push(`ردیف ${index + 2}: کد ${code} تکراری است.`);
          return;
        }

        seen.add(code);

        imported.push({
          code,
          name,
          group,
          subgroup,
          active: true,
        });
      });

      if (imported.length === 0) {
        setMessage(
          errors.length > 0
            ? errors.slice(0, 5).join('\n')
            : 'اطلاعات قابل ورود در فایل پیدا نشد.'
        );
        return;
      }

      const existingCodes = new Set(
        foods.map((food) => food.code)
      );

      const newCount = imported.filter(
        (food) => !existingCodes.has(food.code)
      ).length;

      const updateCount = imported.length - newCount;

      const summary =
        `پروژه انتخاب‌شده: ${selectedProject}\n\n` +
        `تعداد اطلاعات معتبر: ${imported.length}\n` +
        `غذاهای جدید: ${newCount}\n` +
        `غذاهای دارای کد قبلی: ${updateCount}\n` +
        `ردیف‌های دارای خطا: ${errors.length}\n\n` +
        'غذاهای جدید اضافه و اطلاعات غذاهای دارای کد قبلی به‌روزرسانی می‌شوند.\n' +
        'وضعیت فعال یا غیرفعال غذاهای قبلی حفظ خواهد شد.\n\n' +
        'آیا ادامه می‌دهید؟';

      if (!window.confirm(summary)) return;

      updateFoods((previous) => {
        const updated = new Map(
          previous.map((food) => [food.code, food])
        );

        imported.forEach((food) => {
          const oldFood = updated.get(food.code);

          updated.set(food.code, {
            ...food,
            active: oldFood ? oldFood.active : true,
          });
        });

        return Array.from(updated.values());
      });

      setMessage(
        `ورود اطلاعات برای پروژه ${selectedProject} انجام شد.\n` +
        `${newCount} غذای جدید اضافه شد.\n` +
        `${updateCount} غذا به‌روزرسانی شد.\n` +
        `${errors.length} ردیف دارای خطا بود.`
      );
    } catch {
      setMessage(
        'خواندن فایل با خطا مواجه شد. فرمت و ساختار فایل را بررسی کن.'
      );
    } finally {
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  }

  function exportExcel() {
    const rows = foods.map((food) => ({
      'کد غذا': food.code,
      'نام غذا': food.name,
      'گروه اصلی': food.group,
      زیرگروه: food.subgroup,
      وضعیت: food.active ? 'فعال' : 'غیرفعال',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'بانک غذاها'
    );

    XLSX.writeFile(
      workbook,
      `بانک_غذاها_${selectedProject}.xlsx`
    );
  }

  return (
    <div className="food-bank" dir="rtl">
      <div className="food-page-heading">
        <div>
          <span className="food-eyebrow">
            اطلاعات پایه / مدیریت اطلاعات
          </span>

          <h1>بانک غذاها</h1>

          <p>
            مدیریت کدها، مشخصات و طبقه‌بندی غذاها به تفکیک پروژه
          </p>
        </div>

        <button
          className="food-primary-btn"
          onClick={openNewForm}
        >
          + افزودن غذای جدید
        </button>
      </div>

      {/* انتخاب پروژه */}
      <div className="food-table-panel" style={{ padding: 18, marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 9, fontWeight: 700 }}>
          پروژه موردنظر
        </label>

        <select
          value={selectedProject}
          onChange={(e) => handleProjectChange(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 430,
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 8,
            fontFamily: 'inherit',
          }}
        >
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>

        <p style={{ margin: '10px 0 0', color: '#777', fontSize: 12 }}>
          اطلاعات این صفحه فقط مربوط به پروژه انتخاب‌شده است.
        </p>
      </div>

      <div className="food-stats">
        <div className="food-stat">
          <span>کل غذاهای ثبت‌شده</span>
          <strong>{foods.length.toLocaleString('fa-IR')}</strong>
        </div>

        <div className="food-stat">
          <span>غذاهای فعال</span>
          <strong>{activeCount.toLocaleString('fa-IR')}</strong>
        </div>

        <div className="food-stat">
          <span>گروه‌های غذایی</span>
          <strong>
            {new Set(foods.map((food) => food.group)).size.toLocaleString('fa-IR')}
          </strong>
        </div>
      </div>

      <div className="food-import-panel">
        <div className="food-import-icon">⇧</div>

        <div className="food-import-text">
          <strong>ورود و به‌روزرسانی اطلاعات از Excel</strong>
          <span>
            اطلاعات فایل فقط در بانک غذای پروژه انتخاب‌شده ثبت می‌شود.
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(e) => importExcel(e.target.files?.[0])}
        />

        <button
          className="food-secondary-btn"
          onClick={() => fileRef.current?.click()}
        >
          انتخاب فایل Excel
        </button>

        <button
          className="food-export-btn"
          onClick={exportExcel}
        >
          خروجی Excel
        </button>
      </div>

      {message && (
        <div className="food-message">
          <span style={{ whiteSpace: 'pre-line' }}>{message}</span>

          <button
            onClick={() => setMessage('')}
            aria-label="بستن پیام"
          >
            ×
          </button>
        </div>
      )}

      {showForm && (
        <form className="food-form" onSubmit={saveFood}>
          <div className="food-form-heading">
            <strong>
              {editingCode ? 'ویرایش اطلاعات غذا' : 'ثبت غذای جدید'}
            </strong>

            <button
              type="button"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>

          <div className="food-form-grid">
            <label>
              کد غذا
              <input
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value })
                }
                disabled={!!editingCode}
                required
              />
            </label>

            <label>
              نام غذا
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />
            </label>

            <label>
              گروه اصلی
              <input
                list="food-groups"
                value={form.group}
                onChange={(e) =>
                  setForm({
                    ...form,
                    group: e.target.value,
                    subgroup: '',
                  })
                }
                required
              />

              <datalist id="food-groups">
                {groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </label>

            <label>
              زیرگروه
              <input
                list="food-subgroups"
                value={form.subgroup}
                onChange={(e) =>
                  setForm({ ...form, subgroup: e.target.value })
                }
              />

              <datalist id="food-subgroups">
                {formSubgroups.map((subgroup) => (
                  <option key={subgroup} value={subgroup} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="food-form-actions">
            <button
              type="button"
              className="food-cancel-btn"
              onClick={() => setShowForm(false)}
            >
              انصراف
            </button>

            <button
              type="submit"
              className="food-primary-btn"
            >
              ذخیره اطلاعات
            </button>
          </div>
        </form>
      )}

      <div className="food-table-panel">
        <div className="food-table-heading">
          <div>
            <h2>فهرست غذاها</h2>
            <p>
              بانک غذای اختصاصی پروژه {selectedProject}
            </p>
          </div>

          <span>
            {filteredFoods.length.toLocaleString('fa-IR')} مورد
          </span>
        </div>

        <div className="food-filters">
          <input
            placeholder="جستجو بر اساس کد یا نام غذا..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={groupFilter}
            onChange={(e) => handleGroupFilter(e.target.value)}
          >
            <option value="همه گروه‌ها">همه گروه‌ها</option>

            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          <select
            value={subgroupFilter}
            onChange={(e) => setSubgroupFilter(e.target.value)}
          >
            <option value="همه زیرگروه‌ها">همه زیرگروه‌ها</option>

            {subgroups.map((subgroup) => (
              <option key={subgroup} value={subgroup}>
                {subgroup}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="فعال">فعال</option>
            <option value="غیرفعال">غیرفعال</option>
            <option value="همه">همه وضعیت‌ها</option>
          </select>

          <button
            type="button"
            className="food-cancel-btn"
            onClick={resetFilters}
          >
            پاک کردن فیلترها
          </button>
        </div>

        <div className="food-table-scroll">
          <table className="food-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>کد غذا</th>
                <th>نام غذا</th>
                <th>گروه اصلی</th>
                <th>زیرگروه</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {filteredFoods.map((food, index) => (
                <tr key={food.code}>
                  <td>{(index + 1).toLocaleString('fa-IR')}</td>
                  <td>{food.code}</td>
                  <td className="food-name-cell">{food.name}</td>
                  <td>{food.group}</td>
                  <td>{food.subgroup || '—'}</td>

                  <td>
                    <span
                      className={
                        food.active ? 'food-active' : 'food-inactive'
                      }
                    >
                      {food.active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>

                  <td>
                    <div className="food-row-actions">
                      <button
                        type="button"
                        onClick={() => openEditForm(food)}
                      >
                        ویرایش
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFood(food)}
                      >
                        {food.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredFoods.length === 0 && (
                <tr>
                  <td colSpan={7} className="food-empty">
                    {foods.length === 0
                      ? 'برای این پروژه هنوز غذایی ثبت نشده است.'
                      : 'غذایی با فیلترهای انتخاب‌شده پیدا نشد.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FoodBank;
