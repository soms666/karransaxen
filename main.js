const services = [
  {
    id: "herrklippning",
    name: "Herrklipp",
    duration: 30,
    price: 420,
  },
  {
    id: "skagg",
    name: "Skägg + trim",
    duration: 20,
    price: 290,
  },
  {
    id: "intimklippning",
    name: "Intimklippning",
    duration: 30,
    price: 450,
  },
];

const stylists = [
  { id: "cherie", name: "Cherie", specialty: "Kärrans salong" },
];

const paymentMethods = [
  { id: "cash", name: "Cash" },
  { id: "natura", name: "Natura" },
];

const openingHours = {
  0: [0, 24],
  1: [0, 24],
  2: [0, 24],
  3: [0, 24],
  4: [0, 24],
  5: [0, 24],
  6: [0, 24],
};

const storageKey = "karran-saxen-bookings-v1";
const reviewStorageKey = "karran-saxen-reviews-v1";
const reviewRecipient = "cheriepallin@gmail.com";
const bookingRecipient = "cheriepallin@gmail.com";
const bookingEndpoint = "";
const form = document.getElementById("booking-form");
const serviceSelect = document.getElementById("service");
const dateInput = document.getElementById("date");
const timeSelect = document.getElementById("time-select");
const timePeriods = document.querySelectorAll(".time-period");
const timeHelp = document.getElementById("time-help");
const paymentSelect = document.getElementById("payment-method");
const slotsEl = document.getElementById("slots");
const stylistList = document.getElementById("stylist-list");
const toast = document.getElementById("toast");
const nextAvailableSlot = document.getElementById("next-available-slot");
const reviewForm = document.getElementById("review-form");
const reviewsList = document.getElementById("reviews-list");
const reviewAverage = document.getElementById("review-average");
const reviewStars = document.getElementById("review-stars");

const summaryEls = {
  service: document.getElementById("summary-service"),
  stylist: document.getElementById("summary-stylist"),
  date: document.getElementById("summary-date"),
  time: document.getElementById("summary-time"),
  duration: document.getElementById("summary-duration"),
  price: document.getElementById("summary-price"),
  payment: document.getElementById("summary-payment"),
};

const state = {
  serviceId: services[0].id,
  stylistId: stylists[0].id,
  paymentMethod: paymentMethods[0].id,
  date: todayIso(),
  time: "",
  timePeriod: "morning",
  bookings: readBookings(),
};

let reviews = [];

function todayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function readBookings() {
  try {
    const raw = localStorage.getItem(storageKey);
    const bookings = raw ? JSON.parse(raw) : [];
    return Array.isArray(bookings)
      ? bookings
          .filter((booking) => services.some((service) => service.id === booking.serviceId))
          .map((booking) => ({ ...booking, stylistId: "cherie" }))
      : [];
  } catch {
    return [];
  }
}

function saveBookings() {
  localStorage.setItem(storageKey, JSON.stringify(state.bookings));
}

function readStoredReviews() {
  try {
    const raw = localStorage.getItem(reviewStorageKey);
    const stored = raw ? JSON.parse(raw) : [];
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

async function loadReviews() {
  let fileReviews = [];

  try {
    const response = await fetch("reviews.json", { cache: "no-store" });
    if (response.ok) fileReviews = await response.json();
  } catch {
    fileReviews = [];
  }

  const storedReviews = readStoredReviews();
  const storedIds = new Set(storedReviews.map((review) => review.id));
  reviews = [...storedReviews, ...fileReviews.filter((review) => !storedIds.has(review.id))];
  renderReviews();
}

function saveReviews() {
  localStorage.setItem(reviewStorageKey, JSON.stringify(reviews));
}

function sendReviewEmail(review) {
  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const subject = `Ny recension från ${review.name} · ${review.rating}/5`;
  const body = [
    "NY RECENSION",
    "Kärran & Saxen",
    "────────────────────",
    "",
    `Betyg: ${stars} (${review.rating}/5)`,
    `Namn: ${review.name}`,
    "",
    "Kommentar:",
    review.comment,
    "",
    "Tack för att du delar med dig!",
  ].join("\n");

  const mailto = `mailto:${reviewRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderReviews() {
  if (reviews.length === 0) {
    reviewAverage.textContent = "-";
    reviewStars.textContent = "Inga betyg ännu";
    reviewsList.innerHTML = "<p class=\"empty-state\">Bli den första som lämnar ett betyg.</p>";
    return;
  }

  const average = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
  reviewAverage.textContent = average.toFixed(1);
  reviewStars.textContent = `${"★".repeat(Math.round(average))} · ${reviews.length} betyg`;
  reviewsList.innerHTML = reviews
    .map(
      (review) => `
        <article class="review-item">
          <header>
            <strong>${escapeHtml(review.name)}</strong>
            <span aria-label="${review.rating} av 5 stjärnor">${"★".repeat(Number(review.rating))}</span>
          </header>
          <p>${escapeHtml(review.comment)}</p>
        </article>
      `,
    )
    .join("");
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatTimeLabel(minutesFromMidnight) {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTime(label) {
  const [hours, minutes] = label.split(":").map(Number);
  return hours * 60 + minutes;
}

function getService(id) {
  return services.find((service) => service.id === id) ?? services[0];
}

function getStylist(id) {
  return stylists.find((stylist) => stylist.id === id) ?? stylists[0];
}

function getPaymentMethod(id) {
  return paymentMethods.find((method) => method.id === id) ?? paymentMethods[0];
}

function isSameDay(a, b) {
  return a === b;
}

function generateSlots(date, duration) {
  const dateObj = new Date(`${date}T12:00:00`);
  const day = dateObj.getDay();
  const hours = openingHours[day];

  if (!hours) return [];

  const opening = hours[0] * 60;
  const closing = hours[1] * 60;
  const slots = [];
  const step = 30;

  for (let start = opening; start + duration <= closing; start += step) {
    const label = formatTimeLabel(start);
    const conflicting = state.bookings.some((booking) => {
      if (!isSameDay(booking.date, date)) return false;
      if (booking.stylistId !== state.stylistId) return false;
      const bookedStart = parseTime(booking.time);
      const bookedEnd = bookedStart + booking.duration;
      const candidateEnd = start + duration;
      return start < bookedEnd && candidateEnd > bookedStart;
    });

    slots.push({
      label,
      available: !conflicting && !isPastSlot(date, start),
    });
  }

  return slots;
}

function isPastSlot(date, slotMinutes) {
  const now = new Date();
  const today = todayIso();

  if (date !== today) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= currentMinutes + 15;
}

function renderServices() {
  serviceSelect.innerHTML = services
    .map(
      (service) => `
        <option value="${service.id}">
          ${service.name} · ${service.duration} min · ${service.price} kr
        </option>
      `,
    )
    .join("");
  serviceSelect.value = state.serviceId;
}

function renderStylists() {
  stylistList.innerHTML = stylists
    .map(
      (stylist) => `
        <label class="choice" data-selected="${stylist.id === state.stylistId}">
          <input type="radio" name="stylist" value="${stylist.id}" ${stylist.id === state.stylistId ? "checked" : ""} />
          <strong>${stylist.name}</strong>
          <span>${stylist.specialty}</span>
        </label>
      `,
    )
    .join("");
}

function renderPaymentMethods() {
  paymentSelect.innerHTML = paymentMethods
    .map((method) => `<option value="${method.id}">${method.name}</option>`)
    .join("");
  paymentSelect.value = state.paymentMethod;
}

function renderSlots() {
  const service = getService(state.serviceId);
  const slots = generateSlots(state.date, service.duration);

  if (slots.length === 0) {
    slotsEl.innerHTML = `<div class="booking-list-item"><strong>Stängt denna dag</strong><small>Välj ett annat datum.</small></div>`;
    state.time = "";
    syncSummary();
    return;
  }

  if (!state.time || !slots.some((slot) => slot.label === state.time && slot.available)) {
    const firstAvailable = slots.find((slot) => slot.available);
    state.time = firstAvailable ? firstAvailable.label : "";
  }

  const periods = {
    morning: { start: 6 * 60, end: 12 * 60, label: "Förmiddag" },
    afternoon: { start: 12 * 60, end: 18 * 60, label: "Eftermiddag" },
    evening: { start: 18 * 60, end: 24 * 60, label: "Kväll" },
    night: { start: 0, end: 6 * 60, label: "Natt" },
  };

  const currentPeriod = periods[state.timePeriod] ?? periods.morning;
  const periodSlots = slots.filter((slot) => {
    const minutes = parseTime(slot.label);
    return minutes >= currentPeriod.start && minutes < currentPeriod.end;
  });

  const firstAvailable = periodSlots.find((slot) => slot.available);
  if (!periodSlots.some((slot) => slot.label === state.time && slot.available)) {
    state.time = firstAvailable ? firstAvailable.label : "";
  }

  timeSelect.innerHTML = periodSlots
    .map(
      (slot) => `<option value="${slot.label}" ${slot.available ? "" : "disabled"}>${slot.label}${slot.available ? "" : " · upptagen"}</option>`,
    )
    .join("");
  timeSelect.value = state.time;
  timeSelect.disabled = !firstAvailable;
  timeHelp.textContent = firstAvailable
    ? `${periodSlots.filter((slot) => slot.available).length} lediga tider på ${currentPeriod.label.toLowerCase()}.`
    : `Inga lediga tider på ${currentPeriod.label.toLowerCase()}. Välj en annan period.`;
  timePeriods.forEach((button) => {
    const selected = button.dataset.period === state.timePeriod;
    button.dataset.selected = String(selected);
    button.setAttribute("aria-selected", String(selected));
  });

  syncSummary();
}

function syncSummary() {
  const service = getService(state.serviceId);
  const stylist = getStylist(state.stylistId);

  summaryEls.service.textContent = service.name;
  summaryEls.stylist.textContent = stylist.name;
  summaryEls.date.textContent = state.date ? formatDate(state.date) : "-";
  summaryEls.time.textContent = state.time || "-";
  summaryEls.duration.textContent = `${service.duration} minuter`;
  summaryEls.price.textContent = `${service.price} kr`;
  summaryEls.payment.textContent = getPaymentMethod(state.paymentMethod).name;

  stylistList.querySelectorAll(".choice").forEach((choice) => {
    const input = choice.querySelector('input[name="stylist"]');
    choice.dataset.selected = String(input.value === state.stylistId);
  });

  serviceSelect.value = state.serviceId;
  dateInput.value = state.date;
  nextAvailableSlot.textContent = findNextAvailable();
}

function findNextAvailable() {
  const service = getService(state.serviceId);
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const iso = date.toISOString().slice(0, 10);
    const slots = generateSlots(iso, service.duration);
    const available = slots.find((slot) => slot.available);
    if (available) {
      return `${formatDate(iso)} · ${available.label}`;
    }
  }
  return "Inga lediga tider de närmaste 14 dagarna";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function buildBookingEmail(booking) {
  const service = getService(booking.serviceId);
  const stylist = getStylist(booking.stylistId);
  const subject = `Ny bokning: ${service.name} ${formatDate(booking.date)} kl. ${booking.time}`;
  const body = [
    "Ny bokning hos Kärran & Saxen",
    "",
    `Namn: ${booking.name}`,
    `E-post: ${booking.email}`,
    `Telefon: ${booking.phone}`,
    `Tjänst: ${service.name}`,
    `Stylist: ${stylist.name}`,
    `Datum: ${formatDate(booking.date)}`,
    `Tid: ${booking.time}`,
    `Längd: ${service.duration} minuter`,
    `Pris: ${service.price} kr`,
    `Betalning: ${getPaymentMethod(booking.paymentMethod).name}`,
    `Notering: ${booking.notes || "-"}`,
  ].join("\n");

  return { subject, body };
}

async function sendBookingNotification(booking) {
  if (bookingEndpoint) {
    const response = await fetch(bookingEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...booking, recipient: bookingRecipient }),
    });

    if (!response.ok) throw new Error("Bokningsutskicket misslyckades.");
    return "server";
  }

  const { subject, body } = buildBookingEmail(booking);
  const mailto = `mailto:${bookingRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
  return "mailto";
}

function seedDemoBookings() {
  if (state.bookings.length > 0) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const twoDays = new Date();
  twoDays.setDate(twoDays.getDate() + 2);
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);

  state.bookings = [
    {
      id: crypto.randomUUID(),
      serviceId: "herrklippning",
      stylistId: "cherie",
      paymentMethod: "cash",
      date: tomorrow.toISOString().slice(0, 10),
      time: "10:30",
      duration: 30,
      name: "Alex",
      email: "alex@example.com",
      phone: "070-111 22 33",
      notes: "Kort fade med skarp nacke.",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      serviceId: "intimklippning",
      stylistId: "cherie",
      paymentMethod: "natura",
      date: twoDays.toISOString().slice(0, 10),
      time: "13:00",
      duration: 30,
      name: "Sofia",
      email: "sofia@example.com",
      phone: "070-222 33 44",
      notes: "Önskar en lugn och diskret behandling.",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      serviceId: "skagg",
      stylistId: "cherie",
      paymentMethod: "cash",
      date: threeDays.toISOString().slice(0, 10),
      time: "11:15",
      duration: 20,
      name: "Oskar",
      email: "oskar@example.com",
      phone: "070-333 44 55",
      notes: "Skägglinje och form.",
      createdAt: new Date().toISOString(),
    },
  ];

  saveBookings();
}

function updateChoiceSelection() {
  stylistList.querySelectorAll(".choice").forEach((choice) => {
    const input = choice.querySelector('input[name="stylist"]');
    choice.dataset.selected = String(input.value === state.stylistId);
  });
}

function initDateInput() {
  const minDate = todayIso();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14);
  dateInput.min = minDate;
  dateInput.max = maxDate.toISOString().slice(0, 10);
  dateInput.value = state.date;
}

function ensureAvailableDate() {
  const service = getService(state.serviceId);

  for (let offset = 0; offset <= 14; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const iso = date.toISOString().slice(0, 10);
    if (generateSlots(iso, service.duration).some((slot) => slot.available)) {
      state.date = iso;
      dateInput.value = iso;
      return;
    }
  }
}

async function handleBookingSubmit(event) {
  event.preventDefault();

  if (!state.time) {
    showToast("Välj en ledig tid först.");
    return;
  }

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const paymentMethod = paymentSelect.value;
  const notes = document.getElementById("notes").value.trim();

  if (!name || !email || !phone) {
    showToast("Fyll i namn, e-post och telefon.");
    return;
  }

  const service = getService(state.serviceId);
  const conflict = state.bookings.some((booking) => {
    if (!isSameDay(booking.date, state.date)) return false;
    if (booking.stylistId !== state.stylistId) return false;
    const bookedStart = parseTime(booking.time);
    const bookedEnd = bookedStart + booking.duration;
    const candidateStart = parseTime(state.time);
    const candidateEnd = candidateStart + service.duration;
    return candidateStart < bookedEnd && candidateEnd > bookedStart;
  });

  if (conflict) {
    showToast("Tiden hann precis bokas. Välj en annan slot.");
    renderSlots();
    return;
  }

  const booking = {
    id: crypto.randomUUID(),
    serviceId: state.serviceId,
    stylistId: state.stylistId,
    date: state.date,
    time: state.time,
    duration: service.duration,
    name,
    email,
    phone,
    paymentMethod,
    notes,
    createdAt: new Date().toISOString(),
  };

  state.bookings.unshift(booking);
  saveBookings();
  renderSlots();
  form.reset();
  state.paymentMethod = paymentMethods[0].id;
  paymentSelect.value = state.paymentMethod;
  syncSummary();

  try {
    const deliveryMode = await sendBookingNotification(booking);
    if (deliveryMode === "server") {
      showToast(`Bokningen är sparad och mejlad till ${bookingRecipient}.`);
    } else {
      showToast("Bokningen är sparad. Ett färdigifyllt mejl öppnas nu.");
    }
  } catch (error) {
    showToast("Bokningen är sparad, men mejlet kunde inte skickas.");
    console.error(error);
  }
}

function attachEvents() {
  serviceSelect.addEventListener("change", () => {
    state.serviceId = serviceSelect.value;
    state.time = "";
    renderSlots();
  });

  timeSelect.addEventListener("change", () => {
    state.time = timeSelect.value;
    syncSummary();
  });

  timePeriods.forEach((button) => {
    button.addEventListener("click", () => {
      state.timePeriod = button.dataset.period;
      renderSlots();
    });
  });

  paymentSelect.addEventListener("change", () => {
    state.paymentMethod = paymentSelect.value;
    syncSummary();
  });

  dateInput.addEventListener("change", () => {
    state.date = dateInput.value || todayIso();
    state.time = "";
    state.timePeriod = "morning";
    renderSlots();
  });

  stylistList.addEventListener("change", (event) => {
    const input = event.target.closest('input[name="stylist"]');
    if (!input) return;
    state.stylistId = input.value;
    updateChoiceSelection();
    state.time = "";
    renderSlots();
  });

  form.addEventListener("submit", handleBookingSubmit);
  reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("review-name").value.trim();
    const rating = Number(document.getElementById("review-rating").value);
    const comment = document.getElementById("review-comment").value.trim();

    if (!name || !comment || rating < 1 || rating > 5) return;

    reviews.unshift({
      id: crypto.randomUUID(),
      name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    });
    saveReviews();
    renderReviews();
    reviewForm.reset();
    showToast("Tack för din recension!");
    sendReviewEmail({ name, rating, comment });
  });
}

function init() {
  seedDemoBookings();
  renderServices();
  renderStylists();
  renderPaymentMethods();
  initDateInput();
  ensureAvailableDate();
  attachEvents();
  state.time = "";
  renderSlots();
  syncSummary();
  loadReviews();
}

init();
