#!/bin/sh
set -eu

manifest="android/app/src/main/AndroidManifest.xml"
gradle_kts="android/app/build.gradle.kts"
gradle_groovy="android/app/build.gradle"

if [ -f "$manifest" ]; then
  add_permission() {
    permission="$1"
    if ! grep -q "$permission" "$manifest"; then
      sed -i "/<manifest/a\\    <uses-permission android:name=\"android.permission.$permission\"/>" "$manifest"
    fi
  }

  add_permission "POST_NOTIFICATIONS"
  add_permission "RECEIVE_BOOT_COMPLETED"
  add_permission "VIBRATE"
  add_permission "INTERNET"

  if ! grep -q "ScheduledNotificationReceiver" "$manifest"; then
    sed -i "/<activity/i\\        <receiver android:exported=\"false\" android:name=\"com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver\" />\\
        <receiver android:exported=\"false\" android:name=\"com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver\">\\
            <intent-filter>\\
                <action android:name=\"android.intent.action.BOOT_COMPLETED\" />\\
                <action android:name=\"android.intent.action.MY_PACKAGE_REPLACED\" />\\
            </intent-filter>\\
        </receiver>" "$manifest"
  fi

fi

if [ -f "$gradle_kts" ]; then
  if ! grep -q "isCoreLibraryDesugaringEnabled" "$gradle_kts"; then
    sed -i "/compileOptions {/a\\        isCoreLibraryDesugaringEnabled = true" "$gradle_kts"
  fi

  sed -i "/^[[:space:]]*ndkVersion = flutter.ndkVersion/d" "$gradle_kts"
  sed -i "s/JavaVersion.VERSION_11/JavaVersion.VERSION_17/g" "$gradle_kts"

  if ! grep -q "multiDexEnabled" "$gradle_kts"; then
    sed -i "/defaultConfig {/a\\        multiDexEnabled = true" "$gradle_kts"
  fi

  if ! grep -q "coreLibraryDesugaring" "$gradle_kts"; then
    if grep -q "^dependencies {" "$gradle_kts"; then
      sed -i "/^dependencies {/a\\    coreLibraryDesugaring(\"com.android.tools:desugar_jdk_libs:2.1.5\")" "$gradle_kts"
    else
      cat >> "$gradle_kts" <<'EOF'

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
EOF
    fi
  fi
fi

if [ -f "$gradle_groovy" ]; then
  if ! grep -q "coreLibraryDesugaringEnabled" "$gradle_groovy"; then
    sed -i "/compileOptions {/a\\        coreLibraryDesugaringEnabled true" "$gradle_groovy"
  fi

  sed -i "/^[[:space:]]*ndkVersion flutter.ndkVersion/d" "$gradle_groovy"
  sed -i "s/JavaVersion.VERSION_11/JavaVersion.VERSION_17/g" "$gradle_groovy"

  if ! grep -q "multiDexEnabled" "$gradle_groovy"; then
    sed -i "/defaultConfig {/a\\        multiDexEnabled true" "$gradle_groovy"
  fi

  if ! grep -q "coreLibraryDesugaring" "$gradle_groovy"; then
    if grep -q "^dependencies {" "$gradle_groovy"; then
      sed -i "/^dependencies {/a\\    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'" "$gradle_groovy"
    else
      cat >> "$gradle_groovy" <<'EOF'

dependencies {
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'
}
EOF
    fi
  fi
fi
