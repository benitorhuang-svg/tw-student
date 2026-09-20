[CmdletBinding()]
param(
  [string]$ProjectId = 'tw-student',
  [string]$Location = 'asia-east1',
  [string]$Repository = 'projects/tw-student/locations/asia-east1/connections/github-host/repositories/benitorhuang-svg-tw-student',
  [string]$BuildServiceAccount = 'firebase-adminsdk-fbsvc@tw-student.iam.gserviceaccount.com',
  [string]$TriggerName = 'tw-student-atlas-data-refresh',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$SchedulerServiceAccountName = 'cloud-build-trigger-scheduler'
$SchedulerServiceAccount = "$SchedulerServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$BuildServiceAccountResource = "projects/$ProjectId/serviceAccounts/$BuildServiceAccount"
$LegacyJobName = 'tw-student-atlas-data-refresh'
$RefreshJobs = @(
  @{ Name = 'tw-student-atlas-data-refresh-jan'; Schedule = '30 3 31 1 *'; Label = 'January year-end release' },
  @{ Name = 'tw-student-atlas-data-refresh-feb'; Schedule = '30 3 28 2 *'; Label = 'February year-end release' },
  @{ Name = 'tw-student-atlas-data-refresh-may'; Schedule = '30 3 31 5 *'; Label = 'May year-end release' },
  @{ Name = 'tw-student-atlas-data-refresh-sep'; Schedule = '30 3 30 9 *'; Label = 'September back-to-school release' }
)

function Test-GcloudResource([scriptblock]$Command) {
  try {
    $null = & $Command 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

gcloud services enable cloudscheduler.googleapis.com --project $ProjectId --quiet

if (-not (Test-GcloudResource { gcloud iam service-accounts describe $SchedulerServiceAccount --project $ProjectId })) {
  gcloud iam service-accounts create $SchedulerServiceAccountName --project $ProjectId --display-name 'Cloud Build scheduled data refresh'
}

gcloud projects add-iam-policy-binding $ProjectId --member "serviceAccount:$SchedulerServiceAccount" --role roles/cloudbuild.builds.editor --condition None --quiet | Out-Null
gcloud iam service-accounts add-iam-policy-binding $BuildServiceAccountResource --member "serviceAccount:$SchedulerServiceAccount" --role roles/iam.serviceAccountUser --quiet | Out-Null

if (-not (Test-GcloudResource { gcloud builds triggers describe $TriggerName --project $ProjectId --region $Location })) {
  gcloud builds triggers create manual `
    --project $ProjectId `
    --region $Location `
    --name $TriggerName `
    --description 'Refresh official MOE student data after the annual statistics publication window.' `
    --repository $Repository `
    --branch $Branch `
    --build-config infra/cloudbuild.yaml `
    --service-account $BuildServiceAccountResource `
    --no-require-approval
}

$Trigger = gcloud builds triggers describe $TriggerName --project $ProjectId --region $Location --format=json | ConvertFrom-Json
$TriggerUri = "https://cloudbuild.googleapis.com/v1/projects/$ProjectId/locations/$Location/triggers/$($Trigger.id):run"
$RequestBody = @{ projectId = $ProjectId; triggerId = $Trigger.id; source = @{ branchName = $Branch } } | ConvertTo-Json -Compress

if (Test-GcloudResource { gcloud scheduler jobs describe $LegacyJobName --project $ProjectId --location $Location }) {
  gcloud scheduler jobs delete $LegacyJobName --project $ProjectId --location $Location --quiet
}

foreach ($job in $RefreshJobs) {
  $JobExists = Test-GcloudResource { gcloud scheduler jobs describe $job.Name --project $ProjectId --location $Location }
  $SchedulerCommand = if ($JobExists) { 'update' } else { 'create' }
  $HeadersArgument = if ($JobExists) { '--update-headers' } else { '--headers' }
  $SchedulerArgs = @(
    'scheduler', 'jobs', $SchedulerCommand, 'http', $job.Name,
    '--project', $ProjectId,
    '--location', $Location,
    '--schedule', $job.Schedule,
    '--time-zone', 'Asia/Taipei',
    '--uri', $TriggerUri,
    '--http-method', 'POST',
    $HeadersArgument, 'Content-Type=application/json',
    '--message-body', $RequestBody,
    '--oauth-service-account-email', $SchedulerServiceAccount,
    '--oauth-token-scope', 'https://www.googleapis.com/auth/cloud-platform',
    '--max-retry-attempts', '2',
    '--min-backoff', '30s',
    '--max-backoff', '10m',
    '--description', "Rebuild the atlas after the $($job.Label).",
    '--quiet'
  )

  & gcloud @SchedulerArgs
  gcloud scheduler jobs describe $job.Name --project $ProjectId --location $Location
}
