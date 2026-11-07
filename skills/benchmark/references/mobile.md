# Mobile performance workloads (iOS and Android)

Lab numbers on a simulator say little about a phone: simulators run on the Mac's CPU and emulators
on the host's, so startup and frame times there are only good for spotting large regressions. Use a
physical mid-range device (or a device farm) for numbers you compare with targets, a release build
(not debug: debug builds skip compiler optimisation and, on Android, Baseline Profiles), and field
data from MetricKit and Android vitals to decide success.

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Workloads, metrics and targets](#1-workloads-metrics-and-targets)
2. [iOS harness](#2-ios-harness)
3. [Android harness](#3-android-harness)
4. [Guards](#4-guards)

## 1. Workloads, metrics and targets

| Workload                                       | Metric                                                             | Default target (tune in `benchmarks/plan.md`)                               | Source                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------- |
| Cold start                                     | time to initial display (TTID) and to full display (TTFD), p50/p90 | Android: TTID < 5 s is the vitals limit, aim for p90 < 1.5 s; iOS: same aim | Android vitals; aim is a product choice      |
| Warm start                                     | TTID p50/p90                                                       | Android vitals: excessive at ≥ 2 s; aim < 1 s                               | Android vitals                               |
| Hot start / resume                             | TTID or resume time                                                | Android vitals: excessive at ≥ 1.5 s; aim < 0.5 s                           | Android vitals                               |
| Main list scroll                               | frame overrun p95/p99 (Android), hitch time ratio (iOS)            | no positive `frameOverrunMs` at p95; hitch ratio < 5 ms/s                   | Macrobenchmark; iOS ratio (memory)           |
| App size                                       | download and install size per device (App Store Connect, Play)     | budget from the first release + 10 %                                        | product choice                               |
| Memory                                         | peak and steady-state on the main journey                          | under the Android vitals tier for the target RAM class                      | Android vitals memory thresholds             |
| Battery (when relevant: location, audio, sync) | energy over a fixed journey, partial wake locks                    | no excessive partial wake locks; energy within + 10 % of baseline           | Android vitals; Macrobenchmark `PowerMetric` |
| Main API call                                  | p95 latency from the device on a throttled network                 | from the API's own budget plus the network profile                          | `spec`                                       |

Android vitals treats cold start ≥ 5 s, warm ≥ 2 s and hot ≥ 1.5 s as excessive, measured as TTID.
Verified on 2026-11-07 against https://developer.android.com/google/play/vitals/launch-time

Core vitals thresholds that affect Play visibility (user-perceived crash rate 1.09 %, ANR rate
0.47 % overall; 8 % per phone model; memory by RAM tier) are listed at
https://developer.android.com/topic/performance/vitals (verified on 2026-11-07); `monitor` watches
them in the field.

## 2. iOS harness

- XCTest performance tests in the UI-test target:
  `measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: true)]) { XCUIApplication().launch() }`
  for launch; `XCTOSSignpostMetric.scrollingAndDecelerationMetric` for scrolling;
  `XCTMemoryMetric`, `XCTCPUMetric` and `XCTStorageMetric` for the main journey. Set a baseline in
  Xcode's test report so a later run fails when it is worse than the baseline plus the allowed
  deviation. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/xctest/xctapplicationlaunchmetric and
  https://developer.apple.com/documentation/xctest/xctossignpostmetric (the older
  `applicationLaunch` and `scrollDecelerationMetric` are deprecated); the baseline behaviour is from
  memory.
- Instruments (App Launch, Time Profiler, Animation Hitches, Allocations, Energy Log) to find the
  cause once a number is bad (memory).
- Field: MetricKit reports launch time (time to first draw, resume time), hang and hitch time, peak
  memory, CPU and disk writes from real users once a day; `MXMetricManager` from iOS 13, and the
  newer `MetricManager` API from iOS 27. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/metrickit

## 3. Android harness

- A `:macrobenchmark` module with `MacrobenchmarkRule.measureRepeated`:
  `StartupTimingMetric()` (outputs `timeToInitialDisplayMs`, `timeToFullDisplayMs`; compare
  medians) with `StartupMode.COLD`, `WARM` and `HOT`; `FrameTimingMetric()` (outputs
  `frameDurationCpuMs` and `frameOverrunMs` at P50/P90/P95/P99; positive overrun = a dropped frame)
  for scrolling; `PowerMetric` on Pixel 6 or later physical devices for energy. Report TTFD from
  Compose with `ReportDrawn`, `ReportDrawnWhen` or `ReportDrawnAfter`. Verified on 2026-11-07
  against https://developer.android.com/topic/performance/benchmarking/macrobenchmark-metrics
- Generate and ship a Baseline Profile from the same journeys; it is usually the cheapest startup
  win (memory).
- Quick manual check: `adb shell am start -S -W <package>/.MainActivity` prints `TotalTime`.
  Verified on 2026-11-07 against https://developer.android.com/topic/performance/vitals/launch-time
- Profile with Android Studio's profilers and Perfetto traces (memory).

## 4. Guards

- `make bench` runs the platform harnesses that exist: `xcodebuild test -only-testing:<PerfTests>`
  and `./gradlew :macrobenchmark:connectedCheck` (memory for the exact task name in your setup).
- Device-bound benchmarks are too noisy and too slow for every push: run them nightly or on release
  branches on one fixed device model, post the diff, and fail on start p50 + 10 % or any new
  positive p95 frame overrun.
- App size is cheap and stable: check it on every PR from the build output (`.ipa` thinned size
  report, `.aab` with `bundletool get-size total`) and fail on + 5 % (memory for the commands).
- Record device model, OS version, build type and compilation mode with every baseline; numbers
  from different devices are never compared.
