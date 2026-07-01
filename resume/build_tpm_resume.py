from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "/Users/admin/Desktop/程式/DaoYouLingDuiZaoXiaBan/resume/林秝帆_TPM履歷.pdf"

FONT_REGULAR = "STHeitiLight"
FONT_BOLD = "STHeitiMedium"
pdfmetrics.registerFont(TTFont(FONT_REGULAR, "/System/Library/Fonts/STHeiti Light.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont(FONT_BOLD, "/System/Library/Fonts/STHeiti Medium.ttc", subfontIndex=0))

INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5f6878")
ACCENT = colors.HexColor("#245c73")
LIGHT = colors.HexColor("#dfe6ee")
SOFT = colors.HexColor("#f5f7fa")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="NameV3",
    parent=styles["Normal"],
    fontName=FONT_BOLD,
    fontSize=23,
    leading=28,
    textColor=INK,
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name="RoleV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=11,
    leading=15,
    textColor=ACCENT,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="ContactV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=8.7,
    leading=12.5,
    textColor=MUTED,
    spaceAfter=9,
))
styles.add(ParagraphStyle(
    name="SectionV3",
    parent=styles["Normal"],
    fontName=FONT_BOLD,
    fontSize=11.5,
    leading=14,
    textColor=INK,
    spaceBefore=9,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="BodyV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=9.55,
    leading=14,
    textColor=INK,
    alignment=TA_LEFT,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="SmallV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=8.55,
    leading=12.2,
    textColor=MUTED,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="PortfolioV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=8.2,
    leading=10.5,
    textColor=INK,
    spaceAfter=1,
))
styles.add(ParagraphStyle(
    name="ConditionLineV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=8.55,
    leading=12.2,
    textColor=MUTED,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="JobV3",
    parent=styles["Normal"],
    fontName=FONT_BOLD,
    fontSize=10.4,
    leading=13.5,
    textColor=INK,
    spaceAfter=1,
))
styles.add(ParagraphStyle(
    name="MetaV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=8.45,
    leading=11.5,
    textColor=MUTED,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="LabelV3",
    parent=styles["Normal"],
    fontName=FONT_BOLD,
    fontSize=8.9,
    leading=11.8,
    textColor=INK,
))
styles.add(ParagraphStyle(
    name="ValueV3",
    parent=styles["Normal"],
    fontName=FONT_REGULAR,
    fontSize=8.9,
    leading=12.4,
    textColor=INK,
))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LIGHT)
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, 15 * mm, 192 * mm, 15 * mm)
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(192 * mm, 9.8 * mm, f"林秝帆 Ivy Lin | TPM Resume V6 | Page {doc.page}")
    canvas.restoreState()


def p(text, style="BodyV3"):
    return Paragraph(text, styles[style])


def section(title):
    return [
        p(title, "SectionV3"),
        Table([[""]], colWidths=[174 * mm], rowHeights=[0.9], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])),
        Spacer(1, 5),
    ]


def bullet(text, width=169):
    row = Table([[p("•", "BodyV3"), p(text, "BodyV3")]], colWidths=[4.5 * mm, width * mm], hAlign="LEFT")
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
    ]))
    return row


def skill_row(label, value):
    return [p(label, "LabelV3"), p(value, "ValueV3")]


story = [
    p("林秝帆 Ivy Lin", "NameV3"),
    p("Technical Product Manager / TPM / Platform Product Manager", "RoleV3"),
    p("桃園市新屋區 | 0912-639-963 | ivy081499@gmail.com", "ContactV3"),
    p("TPM Portfolio：精選產品規格案例，內容已脫敏", "ContactV3"),
]

story += section("職涯摘要")
story.append(p(
    "具約 6 年軟體工程與系統分析背景，近 2 年轉向 Technical Product Manager / Platform PM，擅長將 B2B 平台、營運流程、資料報表與金流/結算規則拆解為 PRD、API Spec、資料口徑、權限流程與 QA 驗收標準。具工程背景，能理解技術限制與跨模組影響，並協助工程、QA、設計與營運團隊對齊複雜系統需求。",
    "BodyV3",
))

story += section("核心能力")
skill_table = Table([
    skill_row("產品交付", "PRD、API Spec、User Story、Acceptance Criteria、QA/UAT、上線風險控管、跨部門協作"),
    skill_row("平台系統", "平台管理端、客戶後台 / B2B 管理後台、前台流程、權限、資料查詢/匯出、操作與稽核紀錄"),
    skill_row("資料與規則", "統計口徑、報表維度、排程更新、金流/佣金/分潤/費率規則、DB 欄位影響、多語系"),
    skill_row("技術背景", "C#/.NET、ASP.NET MVC/Web API、MS SQL/MySQL、Stored Procedure、Dapper、Vue/TypeScript、Redis、MQ、Jenkins"),
], colWidths=[28 * mm, 140 * mm], hAlign="LEFT")
skill_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BOX", (0, 0), (-1, -1), 0.4, LIGHT),
    ("INNERGRID", (0, 0), (-1, -1), 0.35, LIGHT),
    ("BACKGROUND", (0, 0), (-1, -1), SOFT),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(skill_table)

story += section("代表專案")
for item in [
    "資料報表與營運分析平台：面對報表口徑分散與驗收不易，定義留存率、廣告追蹤、投放成效、合作夥伴成效與營運成本報表的資料粒度、公式、查詢、匯出與權限設計，提升報表口徑一致性與驗收效率，約減少 2-3 成跨部門反覆確認。",
    "金流、費率、分潤與結算規則：面對多層級合作夥伴 / 渠道結構與跨報表影響，拆解提領費率、實際提取金額、佣金計算模式、合約維度與派發狀態，讓規則更容易被開發、測試與追蹤，明顯縮短工程與 QA 來回確認。",
    "B2B 平台系統規格標準化：面對平台管理端、客戶後台、前台與報表需求交錯，建立 API、DB 欄位、狀態流程、操作紀錄、稽核紀錄與 QA 驗收規格，減少工程與 QA 理解落差並建立共用交付基準，約減少 2-3 成規格補充與驗收返工。",
]:
    story.append(bullet(item))

story += section("工作經歷")
story.append(p("產品經理副理 / Technical Product Manager", "JobV3"))
story.append(p("樂揚科技事業有限公司 | 2024/01 - 2025/12 | B2B 平台、管理後台、報表與結算規格", "MetaV3"))
for item in [
    "主導 20+ 項 B2B 平台、平台管理端、客戶後台、前台流程與資料報表需求規格，輸出 PRD、流程圖、欄位定義、API Spec、權限、匯出、i18n、例外情境與 QA 驗收條件；因需掌握系統改動範圍，逐漸成為主管與兩位同儕 PM 間的主要溝通窗口，協調分工並掌握整體進度，因系統性風險把關與協調角色獲晉升為產品經理副理。",
    "規劃資料報表與營運分析模組，定義留存率、廣告追蹤、投放成效、合作夥伴成效與營運成本報表，統一資料粒度、公式口徑、5 分鐘排程、查詢條件、匯出欄位與權限設計，提升報表口徑一致性與驗收效率。",
    "拆解金流、費率、分潤與結算規則，規劃提領費用、實際提取金額、佣金計算模式、層級/合約維度與派發狀態，並盤點會員資金、交易紀錄、帳變紀錄與跨報表影響，降低工程實作與 QA 驗收落差。",
    "針對客製需求與通用版型需求，協助評估重複使用機率、維護成本、架構影響、技術債風險與後續擴充性，整理方案、影響範圍與風險供主管決策。",
    "規劃活動票券、任務型優惠、素材管理、多語系與 APP 打包相關規格，定義建立/編輯/停用、資格檢核、狀態流、操作紀錄、稽核紀錄與前後台資料一致性。",
    "與工程、QA、設計、營運協作，釐清需求優先級、規格邊界、例外情境與驗收標準，減少跨部門反覆確認成本，推動複雜平台需求落地。",
]:
    story.append(bullet(item))

story.append(PageBreak())
story += section("工程與系統分析背景")
early_jobs = [
    ("程式設計師 | 趣遊 | 2022/08 - 2023/04", ".NET Core、MS SQL、Dapper、Vue、TypeScript、Jenkins、Redis、WCF", [
        "依 PM 規格開發前台與後台服務，支援多人協作、系統維護與上線交付。",
        "撰寫內部技術文件，保留系統邏輯、開發流程與交接資訊。",
    ]),
    (".NET 程式設計師 | 禾智 | 2021/04 - 2022/04", "C#、.NET Core、Web API、MySQL、Redis、MQ、Hangfire", [
        "與 PM 確認需求並參與架構規劃，開發 API 提供前端資料串接。",
        "負責資料擷取與流程自動化專案，具資料解析與多來源整合經驗。",
    ]),
    ("系統分析師 | 雲端達人 | 2019/11 - 2021/02", "C#、.NET MVC、Vue、TypeScript、Dapper、Stored Procedure", [
        "參與需求訪談、系統分析文件、測試文件與操作手冊製作，協助教育訓練與上線支援。",
    ]),
    ("早期工程經歷 | 弘寬、車創網、可樂旅遊 | 2017/03 - 2019/08", "前端、後端、內部系統、B2C/B2B/B2E 網站維護", [
        "參與健康管理 APP、會員/預約/搜尋/支付流程、旅遊內部系統與網站維護。",
    ]),
]
for title, meta, items in early_jobs:
    story.append(p(title, "JobV3"))
    story.append(p(meta, "MetaV3"))
    for item in items:
        story.append(bullet(item))
    story.append(Spacer(1, 1.5))

story += section("職務匹配重點")
for item in [
    "能把營運需求轉成工程可開發的規格，包含資料欄位、API 行為、狀態流程、權限與例外情境。",
    "具工程背景，能與後端、前端、QA 討論可行性、資料來源、測試條件與上線風險。",
    "熟悉資料型與規則型產品，能定義報表口徑、排程更新、結算公式、稽核紀錄與跨模組影響。",
    "適合 B2B SaaS、平台系統、資料報表、金流/結算、內部營運系統等 TPM / 平台產品職缺。",
]:
    story.append(bullet(item))

story += section("學歷")
edu = Table([
    [p("臺北市立大學", "JobV3"), p("地球環境暨生物資源學系 大學畢業 | 2012/09 - 2016/06", "SmallV3")],
], colWidths=[35 * mm, 132 * mm], hAlign="LEFT")
edu.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 1),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
]))
story.append(edu)

story += section("TPM Portfolio")
story.append(p("精選產品規格案例，內容已脫敏", "SmallV3"))
portfolio_links = [
    ("1. 留存率與會員來源分析報表", "https://app.notion.com/p/2d42cdf68a65806a8b6ed3ccea6eaf88?source=copy_link"),
    ("2. 廣告追蹤與落地頁訪問統計", "https://app.notion.com/p/2d42cdf68a65807fabcdfb82a2e4ffbd?source=copy_link"),
    ("3. 廣告追蹤碼效果報表", "https://app.notion.com/p/2d42cdf68a65801f8b67f4f979ab19fd?source=copy_link"),
    ("4. 合作夥伴營運成本報表", "https://app.notion.com/p/38f2cdf68a6580e8b9d1e8bea3fc4b54?source=copy_link"),
    ("5. 提領費率與實際提取金額規則", "https://app.notion.com/p/2d42cdf68a6580f09514c5a47deba455?source=copy_link"),
    ("6. 佣金 / 分潤計算模式", "https://app.notion.com/p/2d42cdf68a658070baa7d65b92cd08b8?source=copy_link"),
    ("補充文件：分潤計算說明", "https://drive.google.com/file/d/1oxDDvUGO2_6B5cPzbIhihR0zG0eP0oF9/view?usp=sharing"),
]
portfolio_rows = []
for i in range(0, len(portfolio_links), 2):
    row = []
    for label, url in portfolio_links[i:i + 2]:
        row.append(p(f'<link href="{url}"><font color="#245c73">{label}</font></link>', "PortfolioV3"))
    if len(row) == 1:
        row.append(p("", "PortfolioV3"))
    portfolio_rows.append(row)
portfolio_table = Table(portfolio_rows, colWidths=[82 * mm, 82 * mm], hAlign="LEFT")
portfolio_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 1),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
]))
story.append(portfolio_table)

story += section("求職方向")
story.append(p("Technical Product Manager、TPM、Platform Product Manager、Product Owner、後台產品經理。", "BodyV3"))
story += section("求職條件")
story.append(p("求職條件：台北 / 新北 / 新竹；全職日班；一週到職；遠端/混合可討論；待遇面議；英文可讀技術文件與工作訊息。", "ConditionLineV3"))

doc = BaseDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=18 * mm,
    rightMargin=18 * mm,
    topMargin=16 * mm,
    bottomMargin=21 * mm,
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="resume", frames=[frame], onPage=footer)])
doc.build(story)
print(OUTPUT)
