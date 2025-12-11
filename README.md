# Final

```mermaid
erDiagram
    %% 實體定義
    
    Users {
        int id PK
        varchar name
        varchar email UK 
        varchar password 
    }

    Regions {
        int region_code PK 
        varchar name
    }

    Subregions {
        int subregion_code PK 
        int region_code FK 
        varchar subregion_name
    }

    Countries_3NF {
        varchar alpha3 PK 
        varchar name UK 
        int subregion_code FK 
    }

    Data1 {
        varchar Entity PK 
        int Year PK 
        varchar Code 
        decimal LifeExpectancy
    }

    %% 關係定義 (一對多)

    Regions ||--o{ Subregions : "包含"
    Subregions ||--o{ Countries_3NF : "屬於"
    
    %% 由於 Data1 的主鍵是 Entity 和 Year，這裡我們建立 Data1 與 Countries_3NF 之間的隱含關係
    Countries_3NF ||--o{ Data1 : "記錄"s"

    % 簡化 Data1 與 Countries_3NF 的關係 (實際應用中應通過 Country Name 或 Code 連結)
    Data1 ||--o{ Regions : "filtered_by"
