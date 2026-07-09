export const CURRENT_YEAR = (() => {
  const now = new Date()
  const baseYear = now.getFullYear() - 1911
  return now.getMonth() >= 7 ? baseYear : baseYear - 1
})()
export const ACADEMIC_YEARS = Array.from({ length: CURRENT_YEAR - 107 + 1 }, (_, i) => 107 + i)
export const SUMMARY_EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校']
export const SUMMARY_MANAGEMENT_TYPES = ['全部', '公立', '私立']
export const REGION_BY_COUNTY = {
  基隆市: '北部',
  臺北市: '北部',
  新北市: '北部',
  桃園市: '北部',
  新竹市: '北部',
  新竹縣: '北部',
  宜蘭縣: '北部',
  苗栗縣: '中部',
  臺中市: '中部',
  彰化縣: '中部',
  南投縣: '中部',
  雲林縣: '中部',
  嘉義市: '南部',
  嘉義縣: '南部',
  臺南市: '南部',
  高雄市: '南部',
  屏東縣: '南部',
  花蓮縣: '東部',
  臺東縣: '東部',
  澎湖縣: '離島',
  金門縣: '離島',
  連江縣: '離島',
}
