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
    
    Countries_3NF ||--o{ Data1 : "記錄"
    
    %% 由於 Data1 與 Regions 的關係是通過 Countries_3NF 間接建立的，
    %% 為了避免關係混亂並符合 3NF，建議移除 Data1 與 Regions 的直接連結。
    %% Data1 ||--o{ Regions : "filtered_by"

    ```
