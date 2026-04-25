{{/*
Expand the name of the chart.
*/}}
{{- define "ai-resume-analyser.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this.
If release name contains chart name it will be used as a full name.
*/}}
{{- define "ai-resume-analyser.fullname" -}}
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
Create chart label value (name-version).
*/}}
{{- define "ai-resume-analyser.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "ai-resume-analyser.labels" -}}
helm.sh/chart: {{ include "ai-resume-analyser.chart" . }}
{{ include "ai-resume-analyser.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: ai-resume-analyser
{{- end }}

{{/*
Selector labels (used in spec.selector.matchLabels and spec.template.metadata.labels).
*/}}
{{- define "ai-resume-analyser.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-resume-analyser.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Component-specific labels helper.
Usage: {{ include "ai-resume-analyser.componentLabels" (dict "component" "api" "root" .) }}
*/}}
{{- define "ai-resume-analyser.componentLabels" -}}
{{ include "ai-resume-analyser.labels" .root }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Component-specific selector labels.
Usage: {{ include "ai-resume-analyser.componentSelectorLabels" (dict "component" "api" "root" .) }}
*/}}
{{- define "ai-resume-analyser.componentSelectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-resume-analyser.name" .root }}-{{ .component }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
ServiceAccount name.
*/}}
{{- define "ai-resume-analyser.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (printf "%s-%s" (include "ai-resume-analyser.fullname" .) "api") .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Resolve image reference for a given component.
Usage: {{ include "ai-resume-analyser.image" (dict "component" .Values.api "global" .Values.global) }}
*/}}
{{- define "ai-resume-analyser.image" -}}
{{- $registry := .component.image.registry | default .global.imageRegistry -}}
{{- $repo := .component.image.repository -}}
{{- $tag := .component.image.tag | default "latest" -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repo $tag -}}
{{- else -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end -}}
{{- end }}

{{/*
Namespace for all resources.
*/}}
{{- define "ai-resume-analyser.namespace" -}}
{{- .Values.namespace.name | default .Release.Namespace }}
{{- end }}

{{/*
Render topology spread constraints for a component.
Usage: {{ include "ai-resume-analyser.topologySpread" (dict "component" "api" "root" .) | nindent 8 }}
*/}}
{{- define "ai-resume-analyser.topologySpread" -}}
{{- if .root.Values.topologySpreadConstraints.enabled }}
- maxSkew: {{ .root.Values.topologySpreadConstraints.maxSkew }}
  topologyKey: {{ .root.Values.topologySpreadConstraints.topologyKey }}
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app.kubernetes.io/name: {{ include "ai-resume-analyser.name" .root }}-{{ .component }}
      app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}
{{- end }}

{{/*
Render pod anti-affinity for a component (prefer different nodes).
Usage: {{ include "ai-resume-analyser.podAntiAffinity" (dict "component" "api" "root" .) | nindent 8 }}
*/}}
{{- define "ai-resume-analyser.podAntiAffinity" -}}
podAntiAffinity:
  preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            app.kubernetes.io/name: {{ include "ai-resume-analyser.name" .root }}-{{ .component }}
            app.kubernetes.io/instance: {{ .root.Release.Name }}
        topologyKey: kubernetes.io/hostname
{{- end }}
