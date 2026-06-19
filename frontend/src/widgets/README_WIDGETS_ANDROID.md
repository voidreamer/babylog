# HeyBub Android Widget (Glance / RemoteViews)

This document describes how to build an Android home-screen widget that displays
baby tracking data from the HeyBub app.

## Architecture

```
  React App (Capacitor)
       |
       | updateWidgetData()  ->  Capacitor Preferences
       |                          (SharedPreferences)
       v
  GlanceAppWidget / AppWidgetProvider
       |
       | reads SharedPreferences
       | key: "heybub_widget_data"
       v
  Widget UI (Glance Composable or RemoteViews XML)
```

The frontend writes a JSON blob to SharedPreferences after every dashboard
fetch.  The widget reads that JSON and renders it.

## Prerequisites

1. **Android Studio Hedgehog+** with API 26+ (Android 8.0) minimum SDK.
2. The Capacitor Android project (`npx cap open android`).

## Setup Steps

### 1. Locate the SharedPreferences File

Capacitor Preferences writes to `CapacitorStorage` by default:

```kotlin
val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
val json = prefs.getString("heybub_widget_data", null)
```

### 2. Create a Widget Provider

Create `android/app/src/main/java/com/heybub/app/widget/HeyBubWidgetProvider.kt`.

### 3. Register the Widget in AndroidManifest.xml

```xml
<receiver
    android:name=".widget.HeyBubWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/heybub_widget_info" />
</receiver>
```

### 4. Create Widget Info XML

Create `android/app/src/main/res/xml/heybub_widget_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="900000"
    android:initialLayout="@layout/widget_heybub"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description"
    android:previewImage="@drawable/widget_preview" />
```

## Data Contract

The frontend writes JSON to the key `heybub_widget_data` in SharedPreferences.
The Kotlin data classes below match the TypeScript `WidgetData` interface
defined in `src/utils/widgetBridge.ts`.

### Kotlin Models

```kotlin
import kotlinx.serialization.Serializable

@Serializable
data class HeyBubWidgetData(
    val baby_name: String,
    val baby_id: Int,
    val last_updated: String,
    val last_feeding: LastFeeding? = null,
    val last_diaper: LastDiaper? = null,
    val last_sleep: LastSleep? = null,
    val today_summary: TodaySummary
)

@Serializable
data class LastFeeding(
    val time: String,
    val type: String,           // formula, breast, bottle, solid
    val amount: String? = null, // "4oz", "120ml", "15min"
    val minutes_ago: Int
)

@Serializable
data class LastDiaper(
    val time: String,
    val type: String,           // pee, poo, mixed
    val minutes_ago: Int
)

@Serializable
data class LastSleep(
    val start_time: String,
    val end_time: String? = null,  // null = currently sleeping
    val duration_minutes: Int? = null,
    val is_active: Boolean
)

@Serializable
data class TodaySummary(
    val feedings: Int,
    val diapers: Int,
    val sleep_hours: Double,
    val last_update: String
)
```

### Reading Data from SharedPreferences

```kotlin
import android.content.Context
import kotlinx.serialization.json.Json

fun loadWidgetData(context: Context): HeyBubWidgetData? {
    val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
    val json = prefs.getString("heybub_widget_data", null) ?: return null
    return try {
        Json.decodeFromString<HeyBubWidgetData>(json)
    } catch (e: Exception) {
        null
    }
}
```

## Sample AppWidgetProvider (RemoteViews)

### Layout XML

Create `android/app/src/main/res/layout/widget_heybub.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@drawable/widget_background">

    <TextView
        android:id="@+id/baby_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textSize="16sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/last_feeding"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textSize="12sp"
        android:drawableStart="@drawable/ic_feeding"
        android:drawablePadding="4dp" />

    <TextView
        android:id="@+id/last_diaper"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textSize="12sp"
        android:drawableStart="@drawable/ic_diaper"
        android:drawablePadding="4dp" />

    <TextView
        android:id="@+id/sleep_status"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textSize="12sp"
        android:drawableStart="@drawable/ic_sleep"
        android:drawablePadding="4dp" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="4dp">

        <TextView
            android:id="@+id/summary"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="10sp"
            android:textColor="?android:textColorSecondary" />
    </LinearLayout>
</LinearLayout>
```

### Widget Provider

```kotlin
package com.heybub.app.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.heybub.app.R

class HeyBubWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val data = loadWidgetData(context)
        val views = RemoteViews(context.packageName, R.layout.widget_heybub)

        if (data != null) {
            views.setTextViewText(R.id.baby_name, data.baby_name)

            views.setTextViewText(
                R.id.last_feeding,
                data.last_feeding?.let { "Fed ${it.minutes_ago}m ago (${it.type})" }
                    ?: "No feeding recorded"
            )

            views.setTextViewText(
                R.id.last_diaper,
                data.last_diaper?.let { "Diaper ${it.minutes_ago}m ago (${it.type})" }
                    ?: "No diaper recorded"
            )

            views.setTextViewText(
                R.id.sleep_status,
                data.last_sleep?.let {
                    if (it.is_active) "Sleeping now"
                    else it.duration_minutes?.let { d -> "Slept ${d}min" } ?: "Awake"
                } ?: "No sleep recorded"
            )

            val s = data.today_summary
            views.setTextViewText(
                R.id.summary,
                "Today: ${s.feedings}F  ${s.diapers}D  ${s.sleep_hours}h sleep"
            )
        } else {
            views.setTextViewText(R.id.baby_name, "HeyBub")
            views.setTextViewText(R.id.last_feeding, "Open app to load data")
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
```

## Glance (Jetpack Compose) Alternative

If using Jetpack Glance (recommended for new projects):

```kotlin
package com.heybub.app.widget

import android.content.Context
import androidx.glance.*
import androidx.glance.appwidget.*
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import android.graphics.Color

class HeyBubGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = loadWidgetData(context)

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .padding(12.dp)
                    .background(ColorProvider(Color.WHITE, Color.parseColor("#1a1a2e")))
            ) {
                Text(
                    text = data?.baby_name ?: "HeyBub",
                    style = TextStyle(fontSize = 16.sp)
                )

                data?.last_feeding?.let {
                    Text(
                        text = "Fed ${it.minutes_ago}m ago",
                        style = TextStyle(fontSize = 12.sp)
                    )
                }

                data?.last_diaper?.let {
                    Text(
                        text = "Diaper ${it.minutes_ago}m ago",
                        style = TextStyle(fontSize = 12.sp)
                    )
                }

                data?.last_sleep?.let {
                    Text(
                        text = if (it.is_active) "Sleeping" else "Awake",
                        style = TextStyle(fontSize = 12.sp)
                    )
                }

                data?.today_summary?.let { s ->
                    Text(
                        text = "Today: ${s.feedings}F ${s.diapers}D ${s.sleep_hours}h",
                        style = TextStyle(fontSize = 10.sp)
                    )
                }
            }
        }
    }
}

class HeyBubGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = HeyBubGlanceWidget()
}
```

## Forcing a Widget Refresh from the App

Trigger a refresh from the Capacitor native bridge or from application lifecycle:

```kotlin
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent

fun refreshWidgets(context: Context) {
    val intent = Intent(context, HeyBubWidgetProvider::class.java).apply {
        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
    }
    val ids = AppWidgetManager.getInstance(context)
        .getAppWidgetIds(ComponentName(context, HeyBubWidgetProvider::class.java))
    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
    context.sendBroadcast(intent)
}
```

## Troubleshooting

- **Widget shows stale data**: Check that `updatePeriodMillis` in the XML info
  is not set to 0 (disabled).  Also verify the SharedPreferences file name
  matches `"CapacitorStorage"`.
- **JSON parse error**: Compare the Kotlin data classes against the TypeScript
  `WidgetData` interface in `src/utils/widgetBridge.ts`.
- **Widget not appearing in picker**: Ensure the receiver is declared in
  `AndroidManifest.xml` and the `android:resource` points to a valid XML.
