{{/*
Expand the name of the chart.
*/}}
{{- define "o11y-onboarding.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncated at 63 chars because some Kubernetes name fields are limited to this.
*/}}
{{- define "o11y-onboarding.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "o11y-onboarding.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "o11y-onboarding.labels" -}}
helm.sh/chart: {{ include "o11y-onboarding.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: o11y-onboarding-platform
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{ include "o11y-onboarding.selectorLabels" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "o11y-onboarding.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "o11y-onboarding.backend.labels" -}}
{{ include "o11y-onboarding.labels" . }}
app.kubernetes.io/name: backend
app.kubernetes.io/component: api
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "o11y-onboarding.backend.selectorLabels" -}}
{{ include "o11y-onboarding.selectorLabels" . }}
app.kubernetes.io/name: backend
app.kubernetes.io/component: api
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "o11y-onboarding.frontend.labels" -}}
{{ include "o11y-onboarding.labels" . }}
app.kubernetes.io/name: frontend
app.kubernetes.io/component: ui
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "o11y-onboarding.frontend.selectorLabels" -}}
{{ include "o11y-onboarding.selectorLabels" . }}
app.kubernetes.io/name: frontend
app.kubernetes.io/component: ui
{{- end }}

{{/*
Create the name of the backend service account to use.
*/}}
{{- define "o11y-onboarding.backend.serviceAccountName" -}}
{{- printf "%s-backend" (include "o11y-onboarding.fullname" .) }}
{{- end }}

{{/*
Create the name of the frontend service account to use.
*/}}
{{- define "o11y-onboarding.frontend.serviceAccountName" -}}
{{- printf "%s-frontend" (include "o11y-onboarding.fullname" .) }}
{{- end }}

{{/*
Namespace helper
*/}}
{{- define "o11y-onboarding.namespace" -}}
{{- default .Values.global.namespace .Release.Namespace }}
{{- end }}
