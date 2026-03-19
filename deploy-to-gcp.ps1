# PowerShell 腳本：一鍵部署到 GCP Cloud Run
# 請確保您已安裝 Google Cloud SDK 並已登入 (gcloud auth login)

$PROJECT_ID = "tw-student"  # 您在圖片中顯示的 ID
$REGION = "asia-east1"                      # 台灣所在的地區，連線最快
$IMAGE_NAME = "tw-student-atlas"

$GAR_LOCATION = "asia-east1-docker.pkg.dev/$PROJECT_ID/tw-student-atlas"

Write-Host ">>> 授權 Docker 訪問 Artifact Registry..." -ForegroundColor Cyan
gcloud auth configure-docker asia-east1-docker.pkg.dev --quiet

Write-Host ">>> 正在將專案製作成容器映像檔並上傳至 GCP Artifact Registry..." -ForegroundColor Cyan
# 使用 gcloud builds submit 到 Artifact Registry
gcloud builds submit --tag "$GAR_LOCATION/$IMAGE_NAME"

Write-Host ">>> 正在部署到 Cloud Run (啟用 CPU Boost 與 Gzip 優化)..." -ForegroundColor Cyan
gcloud run deploy tw-student-atlas `
  --image "$GAR_LOCATION/$IMAGE_NAME" `
  --platform managed `
  --allow-unauthenticated `
  --region $REGION `
  --port 8080 `
  --memory 1Gi `
  --cpu 1 `
  --cpu-boost `
  --max-instances 10
Write-Host ""
Write-Host ">>> Deployment Complete! Your website is now live." -ForegroundColor Green
