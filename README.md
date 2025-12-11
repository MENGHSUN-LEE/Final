# Final

```mermaid
erDiagram
    %% 實體定義
    
    Users {
        int id PK
        varchar name
        varchar email UK "使用者電子郵件"
        varchar password "雜湊後的密碼"
    }

    Regions {
        int region_code PK "主要區域代碼"
        varchar name
    }

    Subregions {
        int subregion_code PK "次區域代碼"
        int region_code FK "FK to Regions"
        varchar subregion_name
    }

    Countries_3NF {
        varchar alpha3 PK "國家三位代碼 (主鍵)"
        varchar name UK "完整國家名稱"
        int subregion_code FK "FK to Subregions"
    }

    Data1 {
        varchar Entity PK "國家名稱"
        int Year PK "數據年份"
        varchar Code "國家三位代碼 (用於完整性)"
        decimal LifeExpectancy
    }

    %% 關係定義 (一對多)

    Regions ||--o{ Subregions : "包含"
    Subregions ||--o{ Countries_3NF : "屬於"
    
    %% 簡化 Data1 的關係鏈 (通過國家名稱或代碼隱含連結)
    Countries_3NF ||--o{ Data1 : "記錄"
    Countries_3NF ||--o{ Data1 : "recorded_as"

    % 簡化 Data1 與 Countries_3NF 的關係 (實際應用中應通過 Country Name 或 Code 連結)
    Data1 ||--o{ Regions : "filtered_by"
