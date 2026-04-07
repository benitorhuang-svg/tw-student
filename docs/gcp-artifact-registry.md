# 在 GitHub Actions 使用 Google Artifact Registry（快速設定指南）

這份說明包含兩種常見方式：

- 簡單但需儲存金鑰：使用 Service Account JSON (`GCP_SA_KEY`) 放入 GitHub Secrets。
- 建議：Workload Identity Federation（WIF），避免長期金鑰，使用 GitHub OIDC 直接換取短期 GCP 憑證。

以下示範與對應 GitHub Actions workflow（已加入 `.github/workflows/docker-publish.yml`）。

必要前置（任一種方式都需）

- GCP 專案 ID
- Artifact Registry repository（已建立，型別為 Docker）
- 在 GitHub repository 的 `Settings > Secrets and variables > Actions` 新增：
  - `GCP_PROJECT` = your-project-id
  - `GCP_SA_KEY` = (Service Account JSON) OR leave for WIF
  - `ARTIFACT_REGISTRY_LOCATION` = e.g. `asia-east1`
  - `ARTIFACT_REGISTRY_REPOSITORY` = e.g. `tw-student-repo`
  - `IMAGE_NAME` = e.g. `backend`

方法 A — (較快) 使用 Service Account JSON

1. 建立 service account：

```bash
gcloud iam service-accounts create github-actions-builder \
  --display-name="GitHub Actions builder"
```

2. 指派權限（最低需要 `roles/artifactregistry.writer`）：

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-builder@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

3. 產生金鑰並存為 GitHub Secret `GCP_SA_KEY`（將 JSON 內容貼到 secret）：

```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions-builder@${PROJECT_ID}.iam.gserviceaccount.com
# 把 key.json 的完整內容複製到 GitHub Secret 名稱 GCP_SA_KEY
```

4. Workflow 會使用該金鑰，安裝 `gcloud` 並執行 `gcloud auth configure-docker`，然後用 `docker/build-push-action` 推送到 `${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}`。

方法 B —（建議，較安全）使用 Workload Identity Federation (WIF)

WIF 不需要在 GitHub 儲存長期金鑰。大致步驟：

1. 建立 service account 並給 `roles/artifactregistry.writer`。
2. 建立 Workload Identity Pool + Provider 並信任 `https://token.actions.githubusercontent.com`（詳見 GCP 文件）。
3. 允許該 pool 的 GitHub repo subject 可以 impersonate 這個 service account：

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-builder@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/*"
```

4. 在 GitHub Secrets 設定 `GCP_WORKLOAD_IDENTITY_PROVIDER` 或在 workflow 直接填入 provider resource 名稱，並在 workflow 使用 `google-github-actions/auth` 的 `workload_identity_provider` + `service_account` 設定。

參考連結

- Workload Identity Federation: https://cloud.google.com/iam/docs/workload-identity-federation
- Artifact Registry docker auth: https://cloud.google.com/artifact-registry/docs/docker/authentication
- GitHub Actions for GCP: https://github.com/google-github-actions

安全建議

- 優先使用 WIF（無長期金鑰、最小權限）。
- 若使用 JSON key，請把 key 存入 GitHub Secret，並定期輪換/撤銷。 

若要，我可以：

- 幫你產生建議的 `gcloud` 指令腳本（WIF 或 SA-key 版本）。
- 幫你把 workflow 改為 WIF 範例（需要你提供 `PROJECT_NUMBER`、POOL ID 或允許我生成指令）。
