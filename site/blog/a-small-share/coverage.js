const demo = document.querySelector("#coverage-demo");
const input = demo.querySelector("#clip-count");
const specialist = demo.querySelector("#specialist-count");
const broad = demo.querySelector("#broad-count");
const events = [
  {
    rate: 1 / 4,
    meter: demo.querySelector("#common-meter"),
    output: demo.querySelector("#common-value"),
  },
  {
    rate: 1 / 16,
    meter: demo.querySelector("#rare-meter"),
    output: demo.querySelector("#rare-value"),
  },
];

function showAllocation() {
  const count = input.valueAsNumber;
  const remaining = Number(input.max) - count;
  specialist.textContent = `${count} specialist ${count === 1 ? "clip" : "clips"}`;
  broad.textContent = `${remaining} ordinary ${remaining === 1 ? "clip" : "clips"}`;
  input.setAttribute(
    "aria-valuetext",
    `${specialist.textContent}, ${broad.textContent}`,
  );
  for (const event of events) {
    const probability = 1 - (1 - event.rate) ** count;
    event.meter.value = probability;
    const percent = 100 * probability;
    event.output.textContent =
      percent >= 99.95 && percent < 100 ? ">99.9%" : `${percent.toFixed(1)}%`;
    event.meter.setAttribute("aria-valuetext", event.output.textContent);
  }
}

showAllocation();
input.addEventListener("input", showAllocation);
demo.querySelector(".slider-control").hidden = false;
