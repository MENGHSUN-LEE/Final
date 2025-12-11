# Final

```mermaid
erDiagram
    Users {
        int id PK
        varchar name
        varchar email UK "Email address of the user"
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
        varchar alpha3 PK "3-letter country code"
        varchar name UK "Full country name"
        int subregion_code FK
    }

    Data1 {
        varchar Entity PK "Country Name (FK)"
        int Year PK "Year of data record"
        varchar Code "3-letter country code"
        decimal LifeExpectancy
    }

    Regions ||--o{ Subregions : "has"
    Subregions ||--o{ Countries_3NF : "contains"
    Countries_3NF ||--o{ Data1 : "recorded_as"

    % 簡化 Data1 與 Countries_3NF 的關係 (實際應用中應通過 Country Name 或 Code 連結)
    Data1 ||--o{ Regions : "filtered_by"
