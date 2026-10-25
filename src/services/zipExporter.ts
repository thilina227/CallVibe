import JSZip from 'jszip';
import { ANDROID_FILES } from '../data/androidSourceCode';

export async function exportAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root project files
  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "CallVibeGuard"
include(":app")
`
  );

  zip.file(
    'build.gradle.kts',
    `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.compose.compiler) apply false
}
`
  );

  zip.file(
    'gradlew',
    `#!/bin/sh
# Gradle start up script for POSIX systems
APP_BASE_NAME=\`basename "$0"\`
CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar
exec java -jar "$CLASSPATH" "$@"
`,
    { unixPermissions: '755' }
  );

  zip.file(
    'gradlew.bat',
    `@rem Gradle start up script for Windows
@if "%DEBUG%" == "" @echo off
set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar
java -jar "%CLASSPATH%" %*
`
  );

  // Add all files from ANDROID_FILES
  for (const file of ANDROID_FILES) {
    zip.file(file.path, file.content);
  }

  // Generate blob and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'CallVibeGuard-AndroidProject.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
