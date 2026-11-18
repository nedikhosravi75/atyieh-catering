
import { useEffect, useMemo, useState } from 'react';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import './FoodDistribution.css';
import PersianDatePicker from './PersianDatePicker';

type Food = {
  code: string;
  name: string;
  active: boolean;
};

type Center = {
  id: number;
  code: string;
  name: string;
  project: string;
  active: boolean;
};

type FoodOption = {
  foodCode: string;
  forecastPortions: number;
};

type PlanDay = {
  day: number;
  options: FoodOption[];
};

type MenuPlanData = {
  project: string;
  centerId: number;
  year: number;
  month: number;
  status: 'draft' | 'final';
  days: PlanDay[];
};

type DistributionRow = {
  foodCode: string;
  forecastPortions: number;
  actualPortions: number;
  offPlanReason: string;
};

type DistributionRecord = {
  id: string;
  project: string;
  centerId: number;
  distributionDate: string;
  registeredBy: string;
  status: 'draft' | 'final';
  rows: DistributionRow[];
  updatedAt: string;
};

const FOOD_BANKS_KEY = 'atyieh_food_banks_by_project_v1';
const CENTERS_KEY = 'atyieh_kitchen_centers_v1';
const PLANS_KEY = 'atyieh_menu_plans_v1';
const DISTRIBUTIONS_KEY = 'atyieh_food_distribution_v1';

const DEFAULT_PROJECT = 'ورق خودرو چهارمحال';
const TOLERANCE_PERCENT = 15;

const monthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان',
  'آذر', 'دی', 'بهمن', 'اسفند',
];

function toPersianDigits(value: number | string) {
  return String(value).replace(
    /\d/g,
    (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)],
  );
}

function readJSON<T,>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getPersianDate(date: Date) {
  const dateObject = new DateObject({
    date,
    calendar: persian,
    locale: persian_fa,
  });

  return {
    year: dateObject.year,
    month: dateObject.month.number,
    day: dateObject.day,
  };
}

function getVariance(forecast: number, actual: number) {
  if (forecast <= 0) return null;
  return Math.abs(actual - forecast) / forecast * 100;
}

export default function FoodDistribution() {
  const [foodBanks] = useState<Record<string, Food[]>>(() =>
    readJSON(FOOD_BANKS_KEY, {}),
  );

  const [centers] = useState<Center[]>(() =>
    readJSON(CENTERS_KEY, []),
  );

  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [centerId, setCenterId] = useState<number | ''>('');

  const [distributionDate, setDistributionDate] = useState(
    toISODate(new Date()),
  );

  const [registeredBy, setRegisteredBy] = useState('');
  const [rows, setRows] = useState<DistributionRow[]>([]);

  const [records, setRecords] = useState<DistributionRecord[]>(() =>
    readJSON(DISTRIBUTIONS_KEY, []),
  );

  const [newFoodCode, setNewFoodCode] = useState('');
  const [newFoodReason, setNewFoodReason] = useState('');
  const [message, setMessage] = useState('');

  const projects = useMemo(() => {
    const names = new Set<string>([
      DEFAULT_PROJECT,
      ...Object.keys(foodBanks),
      ...centers.map((center) => center.project),
    ]);

    return Array.from(names).filter(Boolean);
  }, [foodBanks, centers]);

  const projectCenters = centers.filter(
    (center) => center.project === project && center.active,
  );

  const projectFoods = (foodBanks[project] || []).filter(
    (food) => food.active,
  );

  const selectedCenter = projectCenters.find(
    (center) => center.id === centerId,
  );

  const selectedDate = new Date(`${distributionDate}T12:00:00`);
  const persianDate = getPersianDate(selectedDate);

  const recordId = `${project}_${centerId}_${distributionDate}`;

  const currentRecord = records.find(
    (record) => record.id === recordId,
  );

  const isLocked = currentRecord?.status === 'final';

  const allowedDate = (() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const selected = new Date(`${distributionDate}T12:00:00`);
    selected.setHours(12, 0, 0, 0);

    const difference = Math.floor(
      (today.getTime() - selected.getTime()) / 86400000,
    );

    return difference >= 0 && difference <= 7;
  })();

  // انتخاب مرکز فعال متناسب با پروژه
  useEffect(() => {
    if (!projectCenters.some((center) => center.id === centerId)) {
      setCenterId(projectCenters[0]?.id ?? '');
    }
  }, [project, centers, centerId]);

  // بارگذاری رکورد توزیع یا برنامه غذایی همان روز
  useEffect(() => {
    setMessage('');
    setNewFoodCode('');
    setNewFoodReason('');

    if (!selectedCenter || !distributionDate) {
      setRows([]);
      setRegisteredBy('');
      return;
    }

    const saved = records.find((record) => record.id === recordId);

    if (saved) {
      setRows(saved.rows);
      setRegisteredBy(saved.registeredBy);
      return;
    }

    setRegisteredBy('');

    const plans = readJSON<Record<string, MenuPlanData>>(
      PLANS_KEY,
      {},
    );

    const planKey = `${project}_${centerId}_${persianDate.year}_${persianDate.month}`;
    const plan = plans[planKey];

    const dayPlan = plan?.days.find(
      (day) => day.day === persianDate.day,
    );

    const plannedRows: DistributionRow[] = [];

    (dayPlan?.options || []).forEach((option) => {
      if (!option.foodCode) return;

      const existing = plannedRows.find(
        (row) => row.foodCode === option.foodCode,
      );

      if (existing) {
        existing.forecastPortions += Number(option.forecastPortions) || 0;
      } else {
        plannedRows.push({
          foodCode: option.foodCode,
          forecastPortions: Number(option.forecastPortions) || 0,
          actualPortions: 0,
          offPlanReason: '',
        });
      }
    });

    setRows(plannedRows);
  }, [
    recordId,
    selectedCenter,
    distributionDate,
    records,
    project,
    centerId,
  ]);

  
function updateActual(foodCode: string, value: string) {
  if (isLocked) return;

  const cleaned = value
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    )
    .replace(/[^\d]/g, '')
    .slice(0, 4);

  setRows((previous) =>
    previous.map((row) =>
      row.foodCode === foodCode
        ? {
            ...row,
            actualPortions: cleaned === '' ? 0 : Number(cleaned),
          }
        : row,
    ),
  );
}


  function addFood() {
    if (isLocked) return;

    if (!newFoodCode) {
      setMessage('ابتدا غذا را انتخاب کن.');
      return;
    }

    if (rows.some((row) => row.foodCode === newFoodCode)) {
      setMessage(
        'این غذا قبلاً برای همین روز ثبت شده است. تعداد پرس آن را در همان ردیف اصلاح کن.',
      );
      return;
    }

    if (!newFoodReason.trim()) {
      setMessage('برای غذای خارج از برنامه، درج دلیل الزامی است.');
      return;
    }

    setRows((previous) => [
      ...previous,
      {
        foodCode: newFoodCode,
        forecastPortions: 0,
        actualPortions: 0,
        offPlanReason: newFoodReason.trim(),
      },
    ]);

    setNewFoodCode('');
    setNewFoodReason('');
    setMessage('غذای خارج از برنامه اضافه شد.');
  }

  function removeFood(foodCode: string) {
    if (isLocked) return;

    setRows((previous) =>
      previous.filter((row) => row.foodCode !== foodCode),
    );
  }

  function saveDistribution(finalize: boolean) {
    if (!selectedCenter) {
      setMessage('ابتدا مرکز طبخ را انتخاب کن.');
      return;
    }

    if (!allowedDate) {
      setMessage(
        'ثبت عادی فقط در روز توزیع و تا ۷ روز تقویمی پس از آن مجاز است. ثبت دیرهنگام نیازمند تأیید مدیر پروژه است.',
      );
      return;
    }

    if (!registeredBy.trim()) {
      setMessage('نام ثبت‌کننده را وارد کن.');
      return;
    }

    if (rows.length === 0) {
      setMessage('برای این روز هیچ غذایی ثبت نشده است.');
      return;
    }

    if (
      finalize &&
      !window.confirm(
        'پس از ثبت نهایی، اطلاعات این روز قفل می‌شود. آیا مطمئن هستی؟',
      )
    ) {
      return;
    }

    const record: DistributionRecord = {
      id: recordId,
      project,
      centerId: Number(centerId),
      distributionDate,
      registeredBy: registeredBy.trim(),
      status: finalize ? 'final' : 'draft',
      rows,
      updatedAt: new Date().toISOString(),
    };

    const nextRecords = [
      ...records.filter((item) => item.id !== recordId),
      record,
    ];

    localStorage.setItem(
      DISTRIBUTIONS_KEY,
      JSON.stringify(nextRecords),
    );

    setRecords(nextRecords);

    setMessage(
      finalize
        ? 'عملیات توزیع با موفقیت ثبت نهایی و قفل شد.'
        : 'پیش‌نویس عملیات توزیع ذخیره شد.',
    );
  }

  const totalForecast = rows.reduce(
    (sum, row) => sum + row.forecastPortions,
    0,
  );

  const totalActual = rows.reduce(
    (sum, row) => sum + row.actualPortions,
    0,
  );

  const dailyVariance = getVariance(totalForecast, totalActual);

  function getFoodName(code: string) {
    return projectFoods.find((food) => food.code === code)?.name || code;
  }

  return (
    <div className="distribution-page" dir="rtl">

      {/* سربرگ سازمانی آتیه */}
      <div className="distribution-header">
        <div className="distribution-brand">
          <img
             src="/atyieh-logo.png?v=1"
             alt="لوگوی آتیه تعاون سپاهان"
             className="distribution-logo"
           />

          <div className="distribution-brand-text">
            <h2>شرکت آتیه تعاون سپاهان</h2>
            <p>سامانه مدیریت عملیات طبخ و توزیع غذا</p>
            <span>ثبت عملیات توزیع غذا</span>
          </div>
        </div>

        <span
          className={`distribution-status ${
            isLocked ? 'final' : 'draft'
          }`}
        >
          {isLocked
            ? 'ثبت نهایی و قفل‌شده'
            : 'قابل ثبت و ویرایش'}
        </span>
      </div>

      {/* اطلاعات اولیه عملیات */}
      <div className="distribution-filters">

        <div className="distribution-field">
          <label>پروژه</label>
          <select
            value={project}
            onChange={(event) => {
              setProject(event.target.value);
              setCenterId('');
            }}
          >
            {projects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="distribution-field">
          <label>مرکز طبخ</label>
          <select
            value={centerId}
            onChange={(event) =>
              setCenterId(
                event.target.value
                  ? Number(event.target.value)
                  : '',
              )
            }
          >
            <option value="">انتخاب مرکز طبخ</option>

            {projectCenters.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </div>

        <div className="distribution-field">
          <label>تاریخ توزیع</label>

          <PersianDatePicker
            value={distributionDate}
            onChange={setDistributionDate}
          />

          <small>
            {toPersianDigits(persianDate.day)}{' '}
            {monthNames[persianDate.month - 1]}{' '}
            {toPersianDigits(persianDate.year)}
          </small>
        </div>

        <div className="distribution-field">
          <label>نام ثبت‌کننده</label>
          <input
            type="text"
            value={registeredBy}
            disabled={isLocked}
            onChange={(event) =>
              setRegisteredBy(event.target.value)
            }
            placeholder="نام و نام خانوادگی"
          />
        </div>

      </div>

      {!selectedCenter && (
        <div className="distribution-notice">
          برای این پروژه مرکز طبخ فعال ثبت نشده است.
        </div>
      )}

      {selectedCenter && (
        <>
          {/* خلاصه آماری */}
          <div className="distribution-summary">

            <div>
              <span>تاریخ عملیات</span>
              <strong>
                {toPersianDigits(persianDate.day)}{' '}
                {monthNames[persianDate.month - 1]}{' '}
                {toPersianDigits(persianDate.year)}
              </strong>
            </div>

            <div>
              <span>مجموع پرس پیش‌بینی‌شده</span>
              <strong>
                {toPersianDigits(totalForecast)}
              </strong>
            </div>

            <div>
              <span>مجموع پرس توزیع‌شده</span>
              <strong>
                {toPersianDigits(totalActual)}
              </strong>
            </div>

            <div>
              <span>اختلاف روزانه</span>
              <strong
                className={
                  dailyVariance !== null &&
                  dailyVariance > TOLERANCE_PERCENT
                    ? 'variance-warning'
                    : ''
                }
              >
                {dailyVariance === null
                  ? 'خارج از برنامه'
                  : `${toPersianDigits(
                      dailyVariance.toFixed(1),
                    )}٪`}
              </strong>
            </div>

          </div>

          {/* جدول توزیع غذا */}
          <div className="distribution-table-wrapper">
            <table className="distribution-table">

              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>نام غذا</th>
                  <th>پرس پیش‌بینی‌شده</th>
                  <th>پرس توزیع‌شده</th>
                  <th>اختلاف درصدی</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="distribution-empty"
                    >
                      برای این تاریخ در برنامه غذایی، غذایی ثبت نشده است.
                      می‌توانی غذای خارج از برنامه را اضافه کنی.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const variance = getVariance(
                      row.forecastPortions,
                      row.actualPortions,
                    );

                    const warning =
                      variance !== null &&
                      variance > TOLERANCE_PERCENT;

                    return (
                      <tr key={row.foodCode}>

                        <td>
                          {toPersianDigits(index + 1)}
                        </td>

                        <td>
                          <strong>
                            {getFoodName(row.foodCode)}
                          </strong>

                          {row.forecastPortions === 0 && (
                            <small className="off-plan-label">
                              خارج از برنامه
                              {row.offPlanReason
                                ? ` ـ ${row.offPlanReason}`
                                : ''}
                            </small>
                          )}
                        </td>

                        <td>
                          {toPersianDigits(row.forecastPortions)}
                        </td>

                        <td>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={
                              row.actualPortions === 0
                                ? ''
                                : toPersianDigits(
                                    row.actualPortions,
                                  )
                            }
                            disabled={isLocked}
                            placeholder="تعداد پرس"
                            onChange={(event) =>
                              updateActual(
                                row.foodCode,
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td
                          className={
                            warning ? 'variance-warning' : ''
                          }
                        >
                          {variance === null
                            ? '—'
                            : `${toPersianDigits(
                                variance.toFixed(1),
                              )}٪`}
                        </td>

                        <td>
                          {row.forecastPortions === 0
                            ? 'خارج از برنامه'
                            : warning
                              ? 'نیازمند بررسی'
                              : 'در محدوده مجاز'}
                        </td>

                        <td>
                          {!isLocked &&
                            row.forecastPortions === 0 && (
                              <button
                                type="button"
                                className="distribution-remove"
                                onClick={() =>
                                  removeFood(row.foodCode)
                                }
                              >
                                حذف
                              </button>
                            )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>

          {/* افزودن غذای خارج از برنامه */}
          {!isLocked && (
            <div className="distribution-add-panel">

              <h3>افزودن غذای خارج از برنامه</h3>

              <p>
                در صورت توزیع غذایی که در برنامه روزانه ثبت نشده است،
                دلیل آن باید درج شود.
              </p>

              <div className="distribution-add-fields">

                <div className="distribution-field">
                  <label>انتخاب غذا</label>

                  <select
                    value={newFoodCode}
                    onChange={(event) =>
                      setNewFoodCode(event.target.value)
                    }
                  >
                    <option value="">انتخاب غذا</option>

                    {projectFoods
                      .filter(
                        (food) =>
                          !rows.some(
                            (row) =>
                              row.foodCode === food.code,
                          ),
                      )
                      .map((food) => (
                        <option
                          key={food.code}
                          value={food.code}
                        >
                          {food.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="distribution-field">
                  <label>دلیل توزیع خارج از برنامه</label>

                  <input
                    type="text"
                    value={newFoodReason}
                    onChange={(event) =>
                      setNewFoodReason(event.target.value)
                    }
                    placeholder="شرح دلیل"
                  />
                </div>

                <button
                  type="button"
                  onClick={addFood}
                >
                  افزودن غذا
                </button>

              </div>
            </div>
          )}

          {/* هشدار اختلاف */}
          {dailyVariance !== null &&
            dailyVariance > TOLERANCE_PERCENT && (
              <div className="distribution-warning">
                اختلاف مجموع پرس توزیع‌شده با پیش‌بینی بیش از ۱۵ درصد است؛
                این عملیات نیازمند بررسی است.
              </div>
            )}

          {!allowedDate && (
            <div className="distribution-warning">
              این تاریخ خارج از بازه ثبت عادی است. ثبت دیرهنگام در نسخه فعلی
              فعال نیست و به تأیید مدیر پروژه نیاز دارد.
            </div>
          )}

          {isLocked && (
            <div className="distribution-locked">
              این عملیات ثبت نهایی شده است و امکان ویرایش مستقیم آن وجود ندارد.
              برای مشاهده روز دیگر، تاریخ را تغییر بده.
            </div>
          )}

          {message && (
            <div className="distribution-message">
              {message}
            </div>
          )}

          {/* دکمه‌های ثبت */}
          {!isLocked && (
            <div className="distribution-actions">

              <button
                type="button"
                className="distribution-save"
                disabled={!allowedDate}
                onClick={() => saveDistribution(false)}
              >
                ذخیره پیش‌نویس
              </button>

              <button
                type="button"
                className="distribution-finalize"
                disabled={!allowedDate}
                onClick={() => saveDistribution(true)}
              >
                ثبت نهایی و قفل عملیات
              </button>

            </div>
          )}
        </>
      )}

    </div>
  );
}
