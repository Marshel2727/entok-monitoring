FROM ghcr.io/cirruslabs/flutter:stable

WORKDIR /app

ENV PUB_CACHE=/root/.pub-cache \
    ANDROID_HOME=/opt/android-sdk-linux \
    ANDROID_SDK_ROOT=/opt/android-sdk-linux \
    GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx2048M -XX:MaxMetaspaceSize=1024M -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8"

RUN flutter config --no-analytics

RUN set -eux; \
    yes | sdkmanager --licenses >/dev/null || true; \
    for attempt in 1 2 3; do \
      rm -rf "$ANDROID_SDK_ROOT/ndk/28.2.13676358" "$ANDROID_SDK_ROOT/.temp"; \
      if sdkmanager "ndk;28.2.13676358"; then \
        break; \
      fi; \
      if [ "$attempt" = "3" ]; then \
        exit 1; \
      fi; \
      sleep 5; \
    done

COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

CMD ["sh", "-lc", "if [ ! -d android ]; then flutter create . --platforms=android --project-name penjaga_entok --org com.entok; fi && if [ -f android/gradle.properties ]; then sed -i 's/^org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx2048M -XX:MaxMetaspaceSize=1024M -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8/' android/gradle.properties; fi && flutter pub get && flutter build apk --debug && mkdir -p /output && cp build/app/outputs/flutter-apk/app-debug.apk /output/penjaga-entok-debug.apk"]
