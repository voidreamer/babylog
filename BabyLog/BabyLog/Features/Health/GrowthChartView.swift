import SwiftUI
import Charts

// MARK: - GrowthMetric

enum GrowthMetric: String, CaseIterable, Identifiable {
    case weight = "Weight"
    case height = "Height"
    case head = "Head"

    var id: String { rawValue }

    var unit: String {
        switch self {
        case .weight: return "kg"
        case .height, .head: return "cm"
        }
    }

    var icon: String {
        switch self {
        case .weight: return "scalemass"
        case .height: return "ruler"
        case .head: return "circle.dashed"
        }
    }

    var color: Color {
        switch self {
        case .weight: return .blue
        case .height: return .green
        case .head: return .orange
        }
    }
}

// MARK: - GrowthChartView

struct GrowthChartView: View {
    let growthRecords: [GrowthRecord]
    let baby: Baby

    @Environment(\.colorScheme) private var colorScheme
    @State private var selectedMetric: GrowthMetric = .weight
    @State private var whoData: WHOData?

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    private var isBoy: Bool {
        baby.gender?.lowercased() == "male" || baby.gender?.lowercased() == "boy"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Metric picker
            Picker("Metric", selection: $selectedMetric) {
                ForEach(GrowthMetric.allCases) { metric in
                    Text(metric.rawValue).tag(metric)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 16)

            // Chart
            if let chartData = chartDataPoints, !chartData.isEmpty {
                chartView(data: chartData)
                    .padding(16)
            } else {
                EmptyStateView(
                    icon: selectedMetric.icon,
                    title: "No \(selectedMetric.rawValue) Data",
                    subtitle: "Add growth records to see the chart."
                )
            }

            // Data table
            if !filteredRecords.isEmpty {
                dataTable
            }

            Spacer(minLength: 0)
        }
        .background(theme.background)
        .navigationTitle("Growth Chart")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadWHOData()
        }
    }

    // MARK: - Chart Data Points

    private struct ChartPoint: Identifiable {
        let id = UUID()
        let months: Double
        let value: Double
        let date: String
    }

    private var chartDataPoints: [ChartPoint]? {
        guard let birthDate = baby.birthDate else { return nil }

        return filteredRecords.compactMap { record in
            let value: Double? = {
                switch selectedMetric {
                case .weight: return record.weightKg
                case .height: return record.heightCm
                case .head: return record.headCm
                }
            }()

            guard let value,
                  let months = FormatUtils.ageInMonths(birthDate: birthDate, atDate: record.recordedDate) else {
                return nil
            }

            return ChartPoint(months: months, value: value, date: record.recordedDate)
        }
        .sorted { $0.months < $1.months }
    }

    private var filteredRecords: [GrowthRecord] {
        growthRecords.filter { record in
            switch selectedMetric {
            case .weight: return record.weightKg != nil
            case .height: return record.heightCm != nil
            case .head: return record.headCm != nil
            }
        }
    }

    // MARK: - WHO Percentile Data

    private var whoPercentileData: [WHODataPoint]? {
        guard let whoData else { return nil }

        switch selectedMetric {
        case .weight:
            return isBoy ? whoData.whoWeightBoys : whoData.whoWeightGirls
        case .height:
            return isBoy ? whoData.whoHeightBoys : whoData.whoHeightGirls
        case .head:
            return nil
        }
    }

    // MARK: - Chart View

    @ViewBuilder
    private func chartView(data: [ChartPoint]) -> some View {
        let maxMonths = max(data.map(\.months).max() ?? 12, 12)
        let color = selectedMetric.color

        Chart {
            // WHO percentile bands
            if let whoPoints = whoPercentileData {
                let filtered = whoPoints.filter { Double($0.months) <= maxMonths + 1 }

                // Outer band: p3-p97
                ForEach(filtered) { point in
                    AreaMark(
                        x: .value("Months", point.months),
                        yStart: .value("p3", point.p3),
                        yEnd: .value("p97", point.p97)
                    )
                    .foregroundStyle(color.opacity(0.06))
                    .interpolationMethod(.catmullRom)
                }

                // Inner band: p15-p85
                ForEach(filtered) { point in
                    AreaMark(
                        x: .value("Months", point.months),
                        yStart: .value("p15", point.p15),
                        yEnd: .value("p85", point.p85)
                    )
                    .foregroundStyle(color.opacity(0.10))
                    .interpolationMethod(.catmullRom)
                }

                // p50 median line
                ForEach(filtered) { point in
                    LineMark(
                        x: .value("Months", point.months),
                        y: .value("p50", point.p50)
                    )
                    .foregroundStyle(color.opacity(0.35))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                    .interpolationMethod(.catmullRom)
                }
            }

            // Baby's data line
            ForEach(data) { point in
                LineMark(
                    x: .value("Months", point.months),
                    y: .value(selectedMetric.rawValue, point.value)
                )
                .foregroundStyle(color)
                .lineStyle(StrokeStyle(lineWidth: 2.5))
                .interpolationMethod(.catmullRom)
            }

            // Baby's data points
            ForEach(Array(data.enumerated()), id: \.element.id) { index, point in
                let isLatest = index == data.count - 1
                PointMark(
                    x: .value("Months", point.months),
                    y: .value(selectedMetric.rawValue, point.value)
                )
                .foregroundStyle(color)
                .symbolSize(isLatest ? 60 : 30)
                .annotation(position: .top, spacing: 4) {
                    if isLatest {
                        latestPointAnnotation(point: point)
                    }
                }
            }
        }
        .chartXAxisLabel(position: .bottom) {
            Text("Age (months)")
                .font(.caption2)
                .foregroundStyle(theme.textMuted)
        }
        .chartYAxis {
            AxisMarks(position: .leading) { _ in
                AxisGridLine()
                    .foregroundStyle(theme.border.opacity(0.5))
                AxisValueLabel()
                    .foregroundStyle(theme.textSecondary)
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 6)) { value in
                AxisGridLine()
                    .foregroundStyle(theme.border.opacity(0.3))
                AxisValueLabel {
                    if let months = value.as(Double.self) {
                        Text("\(Int(months))m")
                            .font(.caption2)
                            .foregroundStyle(theme.textSecondary)
                    }
                }
            }
        }
        .chartXScale(domain: 0...maxMonths)
        .frame(height: 320)

        // Legend
        if whoPercentileData != nil {
            HStack(spacing: 16) {
                legendItem(color: color, label: baby.name)
                legendItem(color: color.opacity(0.35), label: "50th percentile", dashed: true)
                legendItem(color: color.opacity(0.10), label: "3rd-97th range", isBand: true)
            }
            .font(.caption2)
            .foregroundStyle(theme.textSecondary)
            .padding(.top, 4)
        }
    }

    // MARK: - Latest Point Annotation

    @ViewBuilder
    private func latestPointAnnotation(point: ChartPoint) -> some View {
        let color = selectedMetric.color
        let valueText = formatValue(point.value)
        let percentileText = calculatePercentileText(value: point.value, atMonth: point.months)

        VStack(spacing: 1) {
            Text(valueText)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(color)
            if let percentileText {
                Text(percentileText)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(theme.textSecondary)
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(theme.surface)
                .shadow(color: .black.opacity(0.08), radius: 2, y: 1)
        )
    }

    private func formatValue(_ value: Double) -> String {
        switch selectedMetric {
        case .weight:
            return FormatUtils.formatWeight(kg: value, useLbs: false)
        case .height, .head:
            return FormatUtils.formatHeight(cm: value, useIn: false)
        }
    }

    // MARK: - Percentile Calculation

    private func calculatePercentileText(value: Double, atMonth: Double) -> String? {
        guard let whoPoints = whoPercentileData else { return nil }
        guard let percentile = calculatePercentile(value: value, atMonth: atMonth, whoPoints: whoPoints) else { return nil }

        let rounded = Int(percentile.rounded())
        let suffix: String
        switch rounded % 10 {
        case 1 where rounded % 100 != 11: suffix = "st"
        case 2 where rounded % 100 != 12: suffix = "nd"
        case 3 where rounded % 100 != 13: suffix = "rd"
        default: suffix = "th"
        }
        return "\(rounded)\(suffix) %ile"
    }

    private func calculatePercentile(value: Double, atMonth: Double, whoPoints: [WHODataPoint]) -> Double? {
        // Find the two WHO data points bracketing this month
        let monthInt = Int(atMonth.rounded())
        guard let point = whoPoints.first(where: { $0.months == monthInt }) else {
            // Fallback: find nearest
            guard let nearest = whoPoints.min(by: { abs($0.months - monthInt) < abs($1.months - monthInt) }) else { return nil }
            return interpolatePercentile(value: value, point: nearest)
        }
        return interpolatePercentile(value: value, point: point)
    }

    private func interpolatePercentile(value: Double, point: WHODataPoint) -> Double? {
        // Map value to percentile using linear interpolation between known percentile values
        let percentiles: [(percentile: Double, whoValue: Double)] = [
            (3, point.p3),
            (15, point.p15),
            (50, point.p50),
            (85, point.p85),
            (97, point.p97),
        ]

        // Below p3
        if value <= point.p3 { return 3 }
        // Above p97
        if value >= point.p97 { return 97 }

        // Find the bracket
        for i in 0..<(percentiles.count - 1) {
            let lower = percentiles[i]
            let upper = percentiles[i + 1]
            if value >= lower.whoValue && value <= upper.whoValue {
                let fraction = (value - lower.whoValue) / (upper.whoValue - lower.whoValue)
                return lower.percentile + fraction * (upper.percentile - lower.percentile)
            }
        }

        return nil
    }

    // MARK: - Legend

    private func legendItem(color: Color, label: String, dashed: Bool = false, isBand: Bool = false) -> some View {
        HStack(spacing: 4) {
            if isBand {
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 12, height: 8)
            } else {
                Rectangle()
                    .fill(color)
                    .frame(width: 12, height: dashed ? 1 : 2)
            }
            Text(label)
        }
    }

    // MARK: - Data Table

    private var dataTable: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Records")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textSecondary)
                .padding(.horizontal, 16)

            LazyVStack(spacing: 0) {
                ForEach(filteredRecords) { record in
                    HStack {
                        Text(FormatUtils.formatDisplayDate(record.recordedDate))
                            .font(.subheadline)
                            .foregroundStyle(theme.text)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        let value: String = {
                            switch selectedMetric {
                            case .weight:
                                return FormatUtils.formatWeight(kg: record.weightKg ?? 0, useLbs: false)
                            case .height:
                                return FormatUtils.formatHeight(cm: record.heightCm ?? 0, useIn: false)
                            case .head:
                                return FormatUtils.formatHeight(cm: record.headCm ?? 0, useIn: false)
                            }
                        }()

                        Text(value)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(selectedMetric.color)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)

                    Divider()
                        .padding(.leading, 16)
                }
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Load WHO Data

    private func loadWHOData() async {
        guard let url = Bundle.main.url(forResource: "who_growth_data", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(WHOData.self, from: data) else {
            return
        }
        whoData = decoded
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        GrowthChartView(
            growthRecords: [
                GrowthRecord(id: 1, babyId: 1, recordedDate: "2025-01-01", weightKg: 3.5, heightCm: 50.0, headCm: 35.0, notes: nil),
                GrowthRecord(id: 2, babyId: 1, recordedDate: "2025-02-01", weightKg: 4.5, heightCm: 54.0, headCm: 37.0, notes: nil),
                GrowthRecord(id: 3, babyId: 1, recordedDate: "2025-03-01", weightKg: 5.8, heightCm: 58.0, headCm: 39.0, notes: nil),
            ],
            baby: Baby(
                id: 1, name: "Emma", birthDate: "2025-01-01", gender: "female",
                profilePhotoUrl: nil, bloodType: nil, birthplace: nil, birthTime: nil,
                isOwner: true, sharedWith: nil, createdAt: nil
            )
        )
    }
}
