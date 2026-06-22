FROM ghcr.io/cirruslabs/flutter:stable

WORKDIR /app

ENV PUB_CACHE=/root/.pub-cache \
    ANDROID_HOME=/opt/android-sdk-linux \
    ANDROID_SDK_ROOT=/opt/android-sdk-linux \
    GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx2048M -XX:MaxMetaspaceSize=1024M -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8"

RUN flutter config --no-analytics

COPY . .

CMD ["sh", "-lc", "if [ ! -d android ]; then flutter create . --platforms=android --project-name penjaga_entok --org com.entok; fi && sh scripts/prepare_android_notifications.sh && if [ -f android/gradle.properties ]; then sed -i 's/^org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx2048M -XX:MaxMetaspaceSize=1024M -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8/' android/gradle.properties; fi && flutter pub get && flutter build apk --debug && mkdir -p /output && cp build/app/outputs/flutter-apk/app-debug.apk /output/penjaga-entok-debug.apk"]
