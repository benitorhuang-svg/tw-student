# PowerShell 腳本：一鍵部署到 GCP Cloud Run
# 請確保您已安裝 Google Cloud SDK 並已登入 (gcloud auth login)

$PROJECT_ID = "organic-victory-485801-i5"  # 您在圖片中顯示的 ID
$REGION = "asia-east1"                      # 台灣所在的地區，連線最快
$IMAGE_NAME = "tw-student-atlas"

Write-Host ">>> 正在將專案製作成容器映像檔並上傳至 GCP..." -ForegroundColor Cyan
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$IMAGE_NAME"

Write-Host ">>> 正在部署到 Cloud Run (不需驗證，所有人可看)..." -ForegroundColor Cyan
gcloud run deploy tw-student-atlas `
  --image "gcr.io/$PROJECT_ID/$IMAGE_NAME" `
  --platform managed `
  --allow-unauthenticated `
  --region $REGION `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 10

Write-Host "`n>>> 部署完成！您的網站已上線。" -ForegroundColor Green
