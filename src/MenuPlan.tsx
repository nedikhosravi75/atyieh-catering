
import { useEffect, useMemo, useState } from 'react';
import './MenuPlan.css';

type Food = {
  code: string;
  name: string;
  group?: string;
  subgroup?: string;
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

type Correction = {
  status: 'pending' | 'editing';
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  originalDays?: PlanDay[];
};

type RevisionRecord = {
  reason: string;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string;
  finalizedAt: string;
  previousDays: PlanDay[];
  newDays: PlanDay[];
};

type MenuPlanData = {
  project: string;
  centerId: number;
  year: number;
  month: number;
  status: 'draft' | 'final';
  days: PlanDay[];
  updatedAt: string;
  correction?: Correction;
  revisionHistory?: RevisionRecord[];
};

const FOOD_BANKS_KEY = 'atyieh_food_banks_by_project_v1';
const CENTERS_KEY = 'atyieh_kitchen_centers_v1';
const PLANS_KEY = 'atyieh_menu_plans_v1';
const DEFAULT_PROJECT = 'ورق خودرو چهارمحال';

const monthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان',
  'آذر', 'دی', 'بهمن', 'اسفند',
];

function getPersianDate(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

function getCurrentPersianDate() {
  return getPersianDate(new Date());
}

function getDaysInPersianMonth(year: number, month: number) {
  const startGregorianYear = year + 621;
  const start = new Date(Date.UTC(startGregorianYear, 0, 1, 12));
  const end = new Date(Date.UTC(startGregorianYear + 2, 0, 1, 12));

  let count = 0;

  for (
    let date = new Date(start);
    date < end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const persianDate = getPersianDate(date);

    if (persianDate.year === year && persianDate.month === month) {
      count++;
    }
  }

  return count;
}

function createEmptyDays(year: number, month: number): PlanDay[] {
  const count = getDaysInPersianMonth(year, month);

  return Array.from({ length: count }, (_, index) => ({
    day: index + 1,
    options: [
      { foodCode: '', forecastPortions: 0 },
      { foodCode: '', forecastPortions: 0 },
    ],
  }));
}

function readFoodBanks(): Record<string, Food[]> {
  try {
    const data = localStorage.getItem(FOOD_BANKS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function readCenters(): Center[] {
  try {
    const data = localStorage.getItem(CENTERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function readPlans(): Record<string, MenuPlanData> {
  try {
    const data = localStorage.getItem(PLANS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fa-IR').format(value);
}

export default function MenuPlan() {
  const currentDate = useMemo(() => getCurrentPersianDate(), []);

  const [foodBanks] = useState<Record<string, Food[]>>(readFoodBanks);
  const [allCenters] = useState<Center[]>(readCenters);

  const projects = useMemo(() => {
    const names = new Set<string>([
      DEFAULT_PROJECT,
      ...Object.keys(foodBanks),
      ...allCenters.map((center) => center.project),
    ]);

    return Array.from(names).filter(Boolean).sort((a, b) => {
      if (a === DEFAULT_PROJECT) return -1;
      if (b === DEFAULT_PROJECT) return 1;
      return a.localeCompare(b, 'fa');
    });
  }, [foodBanks, allCenters]);

  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT);
  const [selectedCenterId, setSelectedCenterId] = useState<number | ''>('');
  const [selectedYear, setSelectedYear] = useState(currentDate.year);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month);

  const [days, setDays] = useState<PlanDay[]>(() =>
    createEmptyDays(currentDate.year, currentDate.month),
  );

  const [status, setStatus] = useState<'draft' | 'final' | 'new'>('new');
  const [correction, setCorrection] = useState<Correction | undefined>();
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([]);

  const [message, setMessage] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [managerName, setManagerName] = useState('');

  const projectCenters = useMemo(
    () =>
      allCenters.filter(
        (center) =>
          center.project === selectedProject && center.active,
      ),
    [allCenters, selectedProject],
  );

  const projectFoods = useMemo(
    () =>
      (foodBanks[selectedProject] || []).filter((food) => food.active),
    [foodBanks, selectedProject],
  );

  const selectedCenter = projectCenters.find(
    (center) => center.id === selectedCenterId,
  );

  const planKey =
    selectedCenterId !== ''
      ? `${selectedProject}_${selectedCenterId}_${selectedYear}_${selectedMonth}`
      : '';

  useEffect(() => {
    if (!projectCenters.some((center) => center.id === selectedCenterId)) {
      setSelectedCenterId(projectCenters[0]?.id ?? '');
    }
  }, [projectCenters, selectedCenterId]);

  useEffect(() => {
    setMessage('');
    setRequestReason('');
    setRequesterName('');
    setManagerName('');

    if (!planKey) {
      setDays(createEmptyDays(selectedYear, selectedMonth));
      setStatus('new');
      setCorrection(undefined);
      setRevisionHistory([]);
      return;
    }

    const savedPlan = readPlans()[planKey];

    if (savedPlan) {
      setDays(savedPlan.days);
      setStatus(savedPlan.status);
      setCorrection(savedPlan.correction);
      setRevisionHistory(savedPlan.revisionHistory || []);
    } else {
      setDays(createEmptyDays(selectedYear, selectedMonth));
      setStatus('new');
      setCorrection(undefined);
      setRevisionHistory([]);
    }
  }, [planKey, selectedYear, selectedMonth]);

  const isCorrectionEditing = correction?.status === 'editing';
  const isLocked = status === 'final' && !isCorrectionEditing;

  function updateFood(
    dayIndex: number,
    optionIndex: number,
    foodCode: string,
  ) {
    if (isLocked) return;

    setDays((previous) =>
      previous.map((day, index) => {
        if (index !== dayIndex) return day;

        const options = [...day.options];
        options[optionIndex] = {
          ...options[optionIndex],
          foodCode,
        };

        return { ...day, options };
      }),
    );

    setMessage('');
  }

  function updatePortions(
    dayIndex: number,
    optionIndex: number,
    value: string,
  ) {
    if (isLocked) return;

    const cleanedValue = value.replace(/[^\d]/g, '').slice(0, 4);
    const portions = cleanedValue === '' ? 0 : Number(cleanedValue);

    setDays((previous) =>
      previous.map((day, index) => {
        if (index !== dayIndex) return day;

        const options = [...day.options];
        options[optionIndex] = {
          ...options[optionIndex],
          forecastPortions: portions,
        };

        return { ...day, options };
      }),
    );

    setMessage('');
  }

  function requestCorrection() {
    if (!planKey) return;

    if (!requesterName.trim()) {
      setMessage('نام درخواست‌کننده را وارد کن.');
      return;
    }

    if (!requestReason.trim()) {
      setMessage('دلیل درخواست اصلاح را وارد کن.');
      return;
    }

    const newCorrection: Correction = {
      status: 'pending',
      reason: requestReason.trim(),
      requestedBy: requesterName.trim(),
      requestedAt: new Date().toISOString(),
    };

    const plans = readPlans();
    const savedPlan = plans[planKey];

    if (!savedPlan) {
      setMessage('برنامه موردنظر پیدا نشد.');
      return;
    }

    plans[planKey] = {
      ...savedPlan,
      correction: newCorrection,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));

    setCorrection(newCorrection);
    setRequestReason('');
    setRequesterName('');
    setMessage('درخواست اصلاح با موفقیت ثبت شد و در انتظار تأیید مدیر پروژه است.');
  }

  function approveCorrection() {
    if (!planKey || !correction || correction.status !== 'pending') return;

    if (!managerName.trim()) {
      setMessage('نام مدیر پروژه را وارد کن.');
      return;
    }

    const approvedCorrection: Correction = {
      ...correction,
      status: 'editing',
      approvedBy: managerName.trim(),
      approvedAt: new Date().toISOString(),
      originalDays: JSON.parse(JSON.stringify(days)),
    };

    const plans = readPlans();
    const savedPlan = plans[planKey];

    if (!savedPlan) {
      setMessage('برنامه موردنظر پیدا نشد.');
      return;
    }

    plans[planKey] = {
      ...savedPlan,
      correction: approvedCorrection,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));

    setCorrection(approvedCorrection);
    setManagerName('');
    setMessage('درخواست تأیید شد. امکان اصلاح برنامه فعال شد.');
  }

  function savePlan(finalize: boolean) {
    if (!selectedCenter) {
      setMessage('ابتدا یک مرکز طبخ فعال برای این پروژه انتخاب کن.');
      return;
    }

    const hasAtLeastOneFood = days.some((day) =>
      day.options.some((option) => option.foodCode !== ''),
    );

    if (!hasAtLeastOneFood) {
      setMessage('برای ثبت برنامه، حداقل یک غذا انتخاب کن.');
      return;
    }

    if (finalize) {
      const incompleteOption = days.some((day) =>
        day.options.some(
          (option) =>
            option.foodCode !== '' && option.forecastPortions <= 0,
        ),
      );

      if (incompleteOption) {
        setMessage(
          'برای تمام غذاهای انتخاب‌شده باید تعداد پرس پیش‌بینی‌شده بیشتر از صفر وارد شود.',
        );
        return;
      }

      const confirmed = window.confirm(
        isCorrectionEditing
          ? 'پس از ثبت نهایی اصلاحات، برنامه دوباره قفل می‌شود. آیا مطمئن هستی؟'
          : 'پس از ثبت نهایی، برنامه قفل می‌شود و ویرایش مستقیم آن امکان‌پذیر نخواهد بود. آیا مطمئن هستی؟',
      );

      if (!confirmed) return;
    }

    const plans = readPlans();
    const previousPlan = plans[planKey];

    let nextHistory = revisionHistory;
    let nextCorrection = correction;

    if (finalize && isCorrectionEditing && correction) {
      const revision: RevisionRecord = {
        reason: correction.reason,
        requestedBy: correction.requestedBy,
        approvedBy: correction.approvedBy || '',
        approvedAt: correction.approvedAt || '',
        finalizedAt: new Date().toISOString(),
        previousDays: correction.originalDays || [],
        newDays: JSON.parse(JSON.stringify(days)),
      };

      nextHistory = [...revisionHistory, revision];
      nextCorrection = undefined;
    }

    const nextStatus: 'draft' | 'final' =
      finalize ? 'final' : isCorrectionEditing ? 'final' : 'draft';

    const plan: MenuPlanData = {
      project: selectedProject,
      centerId: Number(selectedCenterId),
      year: selectedYear,
      month: selectedMonth,
      status: nextStatus,
      days,
      updatedAt: new Date().toISOString(),
      correction: nextCorrection,
      revisionHistory: nextHistory,
    };

    plans[planKey] = {
      ...previousPlan,
      ...plan,
    };

    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));

    setStatus(nextStatus);
    setCorrection(nextCorrection);
    setRevisionHistory(nextHistory);

    setMessage(
      finalize
        ? isCorrectionEditing
          ? 'اصلاحات با موفقیت ثبت نهایی شد و برنامه دوباره قفل شد.'
          : 'برنامه غذایی با موفقیت ثبت نهایی و قفل شد.'
        : isCorrectionEditing
          ? 'اصلاحات به‌صورت موقت ذخیره شد. برنامه همچنان در وضعیت اصلاح است.'
          : 'پیش‌نویس برنامه غذایی با موفقیت ذخیره شد.',
    );
  }

  const totalForecast = days.reduce(
    (total, day) =>
      total +
      day.options.reduce(
        (sum, option) => sum + option.forecastPortions,
        0,
      ),
    0,
  );

  return (
    <div className="menu-plan-page" dir="rtl">
      <div className="menu-plan-header">
        <div>
          <h2>برنامه غذایی ماهیانه</h2>
          <p>
            تنظیم برنامه پیش‌بینی غذا و تعداد پرس به تفکیک پروژه و مرکز طبخ
          </p>
        </div>

        <span className={`plan-status ${status}`}>
          {isCorrectionEditing
            ? 'در حال اصلاح'
            : status === 'final'
              ? 'ثبت نهایی و قفل‌شده'
              : status === 'draft'
                ? 'پیش‌نویس ذخیره‌شده'
                : 'برنامه جدید'}
        </span>
      </div>

      <div className="menu-plan-filters">
        <div className="menu-plan-field">
          <label>پروژه</label>
          <select
            value={selectedProject}
            onChange={(event) => {
              setSelectedProject(event.target.value);
              setSelectedCenterId('');
            }}
          >
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        <div className="menu-plan-field">
          <label>مرکز طبخ</label>
          <select
            value={selectedCenterId}
            onChange={(event) =>
              setSelectedCenterId(
                event.target.value === '' ? '' : Number(event.target.value),
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

        <div className="menu-plan-field">
          <label>سال</label>
          <input
            type="number"
            min="1400"
            max="1500"
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(Number(event.target.value))
            }
          />
        </div>

        <div className="menu-plan-field">
          <label>ماه</label>
          <select
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(Number(event.target.value))
            }
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedCenter && (
        <div className="menu-plan-notice">
          برای این پروژه هنوز مرکز طبخ فعال ثبت نشده است. ابتدا از بخش
          «مدیریت مراکز طبخ» یک مرکز فعال تعریف کن.
        </div>
      )}

      {selectedCenter && projectFoods.length === 0 && (
        <div className="menu-plan-notice">
          برای پروژه انتخاب‌شده هنوز غذای فعالی در بانک غذا وجود ندارد.
        </div>
      )}

      <div className="menu-plan-summary">
        <div>
          <span>پروژه</span>
          <strong>{selectedProject}</strong>
        </div>

        <div>
          <span>مرکز طبخ</span>
          <strong>{selectedCenter?.name || '—'}</strong>
        </div>

        <div>
          <span>دوره برنامه</span>
          <strong>
            {monthNames[selectedMonth - 1]} {formatNumber(selectedYear)}
          </strong>
        </div>

        <div>
          <span>مجموع پرس پیش‌بینی‌شده</span>
          <strong>{formatNumber(totalForecast)}</strong>
        </div>
      </div>

      <div className="menu-plan-table-wrapper">
        <table className="menu-plan-table">
          <thead>
            <tr>
              <th rowSpan={2} className="date-column">تاریخ روز</th>
              <th colSpan={2} className="option-heading">ناهار</th>
              <th colSpan={2} className="option-heading">ناهار نوع ۲ / شام</th>
            </tr>
            <tr>
              <th>نام غذا</th>
              <th>پرس پیش‌بینی‌شده</th>
              <th>نام غذا</th>
              <th>پرس پیش‌بینی‌شده</th>
            </tr>
          </thead>

          <tbody>
            {days.map((day, dayIndex) => (
              <tr key={day.day}>
                <td className="menu-plan-day">
                  {formatNumber(day.day)} {monthNames[selectedMonth - 1]}
                </td>

                {[0, 1].map((optionIndex) => (
                  <>
                    <td className="food-cell" key={`food-${optionIndex}-${day.day}`}>
                      <select
                        className="menu-plan-food-select"
                        value={day.options[optionIndex].foodCode}
                        disabled={isLocked || !selectedCenter}
                        onChange={(event) =>
                          updateFood(dayIndex, optionIndex, event.target.value)
                        }
                      >
                        <option value="">انتخاب غذا</option>
                        {projectFoods.map((food) => (
                          <option key={food.code} value={food.code}>
                            {food.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="portions-cell" key={`portions-${optionIndex}-${day.day}`}>
                      <input
                        className="menu-plan-portions-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="تعداد پرس"
                        value={
                          day.options[optionIndex].forecastPortions === 0
                            ? ''
                            : day.options[optionIndex].forecastPortions
                        }
                        disabled={
                          isLocked ||
                          !selectedCenter ||
                          day.options[optionIndex].foodCode === ''
                        }
                        onChange={(event) =>
                          updatePortions(dayIndex, optionIndex, event.target.value)
                        }
                      />
                    </td>
                  </>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <div className="menu-plan-message">
          {message}
        </div>
      )}

      {isLocked && status === 'final' && (
        <div className="menu-plan-locked-message">
          <p>این برنامه نهایی شده و امکان ویرایش مستقیم آن وجود ندارد.</p>

          {!correction && (
            <div className="menu-plan-correction-panel">
              <h3>درخواست اصلاح برنامه</h3>

              <div className="menu-plan-field">
                <label>نام درخواست‌کننده</label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(event) => setRequesterName(event.target.value)}
                  placeholder="نام و نام خانوادگی"
                />
              </div>

              <div className="menu-plan-field">
                <label>دلیل درخواست اصلاح</label>
                <textarea
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                  placeholder="دلیل نیاز به اصلاح برنامه را بنویس..."
                  rows={3}
                />
              </div>

              <button
                type="button"
                className="menu-plan-save"
                onClick={requestCorrection}
              >
                ثبت درخواست اصلاح
              </button>
            </div>
          )}

          {correction?.status === 'pending' && (
            <div className="menu-plan-correction-panel">
              <h3>درخواست اصلاح در انتظار تأیید مدیر پروژه</h3>
              <p>درخواست‌کننده: {correction.requestedBy}</p>
              <p>دلیل درخواست: {correction.reason}</p>

              <div className="menu-plan-field">
                <label>نام مدیر پروژه تأییدکننده</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(event) => setManagerName(event.target.value)}
                  placeholder="نام و نام خانوادگی مدیر پروژه"
                />
              </div>

              <button
                type="button"
                className="menu-plan-finalize"
                onClick={approveCorrection}
              >
                تأیید درخواست و اجازه اصلاح
              </button>
            </div>
          )}
        </div>
      )}

      {isCorrectionEditing && (
        <div className="menu-plan-locked-message">
          <strong>برنامه در وضعیت اصلاح قرار دارد.</strong>
          <p>دلیل اصلاح: {correction?.reason}</p>
          <p>تأییدکننده: {correction?.approvedBy}</p>
        </div>
      )}

      {correction && correction.status === 'pending' && (
        <div className="menu-plan-message">
          درخواست اصلاح این برنامه ثبت شده و تا زمان تأیید مدیر پروژه، برنامه قفل است.
        </div>
      )}

      {revisionHistory.length > 0 && (
        <div className="menu-plan-correction-panel">
          <h3>سابقه اصلاحات برنامه</h3>
          {revisionHistory.map((revision, index) => (
            <div key={`${revision.finalizedAt}-${index}`}>
              <p>اصلاح شماره {formatNumber(index + 1)}</p>
              <p>دلیل اصلاح: {revision.reason}</p>
              <p>درخواست‌کننده: {revision.requestedBy}</p>
              <p>مدیر تأییدکننده: {revision.approvedBy}</p>
              <p>
                تاریخ ثبت نهایی:{' '}
                {new Date(revision.finalizedAt).toLocaleString('fa-IR')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="menu-plan-actions">
        {!isLocked && (
          <>
            <button
              type="button"
              className="menu-plan-save"
              onClick={() => savePlan(false)}
              disabled={!selectedCenter}
            >
              {isCorrectionEditing ? 'ذخیره موقت اصلاحات' : 'ذخیره پیش‌نویس'}
            </button>

            <button
              type="button"
              className="menu-plan-finalize"
              onClick={() => savePlan(true)}
              disabled={!selectedCenter}
            >
              {isCorrectionEditing ? 'ثبت نهایی اصلاحات' : 'ثبت نهایی برنامه'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
