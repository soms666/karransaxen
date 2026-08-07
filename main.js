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
  1: [9, 18],
  2: [9, 18],
  3: [9, 18],
  4: [9, 18],
  5: [9, 18],
  6: [10, 15],
};

const storageKey = "karran-saxen-bookings-v1";
const bookingRecipient = "cheriepallin@gmail.com";
const bookingEndpoint = "";
const form = document.getElementById("booking-form");
const serviceSelect = document.getElementById("service");
const dateInput = document.getElementById("date");
const paymentSelect = document.getElementById("payment-method");
const slotsEl = document.getElementById("slots");
const stylistList = document.getElementById("stylist-list");
const bookingList = document.getElementById("booking-list");
const toast = document.getElementById("toast");
const nextAvailableSlot = document.getElementById("next-available-slot");

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
  bookings: readBookings(),
};

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
  const step = 15;

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

  slotsEl.innerHTML = slots
    .map((slot) => {
      const selected = slot.label === state.time;
      return `
        <button
          class="slot"
          type="button"
          data-time="${slot.label}"
          aria-pressed="${selected}"
          ${slot.available ? "" : "disabled"}
        >
          ${slot.label}
        </button>
      `;
    })
    .join("");

  syncSummary();
}

function renderBookings() {
  const upcoming = [...state.bookings]
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5);

  bookingList.innerHTML =
    upcoming.length === 0
      ? `<div class="booking-list-item"><strong>Inga bokningar ännu</strong><small>Den första tider dyker upp här när du sparar en bokning.</small></div>`
      : upcoming
          .map((booking) => {
            const service = getService(booking.serviceId);
            const stylist = getStylist(booking.stylistId);
            return `
              <article class="booking-list-item">
                <header>
                  <span>${formatDate(booking.date)} · ${booking.time}</span>
                  <span>${service.price} kr</span>
                </header>
                <small>${service.name} med ${stylist.name}</small>
                <small>${booking.name} · ${booking.phone}</small>
                <small>Betalning: ${getPaymentMethod(booking.paymentMethod).name}</small>
              </article>
            `;
          })
          .join("");
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

function handleSlotClick(event) {
  const button = event.target.closest(".slot");
  if (!button || button.disabled) return;

  state.time = button.dataset.time;
  renderSlots();
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
  renderBookings();
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

  paymentSelect.addEventListener("change", () => {
    state.paymentMethod = paymentSelect.value;
    syncSummary();
  });

  dateInput.addEventListener("change", () => {
    state.date = dateInput.value || todayIso();
    state.time = "";
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

  slotsEl.addEventListener("click", handleSlotClick);
  form.addEventListener("submit", handleBookingSubmit);
}

function init() {
  seedDemoBookings();
  renderServices();
  renderStylists();
  renderPaymentMethods();
  initDateInput();
  attachEvents();
  renderBookings();
  state.time = "";
  renderSlots();
  syncSummary();
}

init();
