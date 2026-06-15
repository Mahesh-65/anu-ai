{{/* helpers logic same as auth but prefixed with ai-service */}}
{{- define "ai-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "ai-service.fullname" -}}
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
{{- define "ai-service.labels" -}}
helm.sh/chart: {{ include "ai-service.name" . }}
{{ include "ai-service.selectorLabels" . }}
{{- end }}
{{- define "ai-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
