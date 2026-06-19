FROM ghcr.io/cirruslabs/flutter:stable

WORKDIR /app

ENV PUB_CACHE=/root/.pub-cache

RUN flutter config --no-analytics

COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

CMD ["sh", "-lc", "if [ ! -d android ]; then flutter create . --platforms=android --project-name penjaga_entok --org com.entok; fi && flutter pub get && flutter build apk --debug"]
