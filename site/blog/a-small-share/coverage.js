const demo = document.querySelector("#coverage-demo");
const input = demo.querySelector("#clip-count");
const specialist = demo.querySelector("#specialist-count");
const broad = demo.querySelector("#broad-count");
const chinese = document.documentElement.lang === "zh-CN";
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
  specialist.textContent = chinese ? `${count} 段专项视频` : `${count} specialist ${count === 1 ? "clip" : "clips"}`;
  broad.textContent = chinese ? `${remaining} 段普通视频` : `${remaining} ordinary ${remaining === 1 ? "clip" : "clips"}`;
  input.setAttribute(
    "aria-valuetext",
    [specialist.textContent, broad.textContent].join(chinese ? "，" : ", "),
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
