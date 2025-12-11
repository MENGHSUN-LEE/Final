-- ETL.sql - 整合結構定義、數據載入與正規化

USE final_project_db;

-- ----------------------------------------------------
-- 階段 1: 建立臨時表格 (Schema Creation)
-- ----------------------------------------------------

-- 建立 Data1 臨時表格 (用於載入 data1.csv)
CREATE TABLE IF NOT EXISTS data1 (
    Entity VARCHAR(100),
    Code CHAR(10),
    Year INT,
    LifeExpectancy DECIMAL(8,4),
    PRIMARY KEY (Entity, Year)
);

-- 建立 Data2 臨時表格 (用於載入 data2.csv，包含所有區域資訊)
CREATE TABLE IF NOT EXISTS data2 (
    name VARCHAR(100),
    alpha2 VARCHAR(10),
    alpha3 VARCHAR(10),
    country_code INT,
    iso_3166_2 VARCHAR(50),
    region VARCHAR(50),
    sub_region VARCHAR(50),
    intermediate_region VARCHAR(50),
    region_code INT NULL,
    sub_region_code INT NULL,
    intermediate_region_code INT NULL
);

-- ----------------------------------------------------
-- 階段 2: 數據載入 (Load Data)
-- ----------------------------------------------------

LOAD DATA INFILE '/var/lib/mysql-files/data1.csv'
INTO TABLE data1
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES;

LOAD DATA INFILE '/var/lib/mysql-files/data2.csv'
INTO TABLE data2
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(
    @name, @a2, @a3, @cc, @iso, @region, @sub, @inter, @rc, @src, @irc
)
SET
    name = NULLIF(TRIM(@name), ''),
    alpha2 = NULLIF(TRIM(@a2), ''),
    alpha3 = NULLIF(TRIM(@a3), ''),
    country_code = NULLIF(TRIM(@cc), ''),
    iso_3166_2 = NULLIF(TRIM(@iso), ''),
    region = NULLIF(TRIM(@region), ''),
    sub_region = NULLIF(TRIM(@sub), ''),
    intermediate_region = NULLIF(TRIM(@inter), ''),
    region_code = NULLIF(TRIM(@rc), ''),
    sub_region_code = NULLIF(TRIM(@src), ''),
    intermediate_region_code = NULLIF(TRIM(@irc), '');

-- ----------------------------------------------------
-- 階段 3: 數據清理與結構正規化 (Transform & Normalize)
-- ----------------------------------------------------

-- A. 清理 data1 (預期壽命數據)
-- 移除無效或非國家的數據
DELETE FROM data1
WHERE Code IS NULL OR TRIM(Code) = '' OR Code LIKE 'OWID_%';

-- B. 清理 data2 (區域數據)
-- 移除非標準國別代碼 (OWID_) 和 Antarctica
DELETE FROM data2
WHERE alpha3 LIKE 'OWID_%' OR name = 'Antarctica' OR alpha3 IS NULL OR TRIM(alpha3) = '';


-- C. 建立最終 3NF 表格

-- 1. Users 表格 (最終表格)
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL, -- 確保 email 是唯一非空
    phone VARCHAR(20),
    password CHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Regions 表格 (最終表格)
CREATE TABLE IF NOT EXISTS regions (
    region_code INT PRIMARY KEY,
    region_name VARCHAR(50) UNIQUE NOT NULL
);
INSERT IGNORE INTO regions (region_code, region_name)
SELECT DISTINCT region_code, region
FROM data2
WHERE region IS NOT NULL AND region_code IS NOT NULL;


-- 3. Subregions 表格 (最終表格)
CREATE TABLE IF NOT EXISTS subregions (
    subregion_code INT PRIMARY KEY,
    subregion_name VARCHAR(50) UNIQUE NOT NULL,
    region_code INT NOT NULL,
    FOREIGN KEY (region_code) REFERENCES regions(region_code)
);
INSERT IGNORE INTO subregions (subregion_code, subregion_name, region_code)
SELECT DISTINCT sub_region_code, sub_region, region_code
FROM data2
WHERE sub_region IS NOT NULL AND sub_region_code IS NOT NULL;


-- 4. Intermediate_regions 表格 (最終表格)
CREATE TABLE IF NOT EXISTS intermediate_regions (
    intermediate_region_code INT PRIMARY KEY,
    intermediate_region_name VARCHAR(50) UNIQUE NOT NULL,
    subregion_code INT NOT NULL,
    FOREIGN KEY (subregion_code) REFERENCES subregions(subregion_code)
);
INSERT IGNORE INTO intermediate_regions (intermediate_region_code, intermediate_region_name, subregion_code)
SELECT DISTINCT intermediate_region_code, intermediate_region, sub_region_code
FROM data2
WHERE intermediate_region IS NOT NULL AND intermediate_region_code IS NOT NULL;


-- 5. Countries_3NF 表格 (最終表格)
CREATE TABLE IF NOT EXISTS countries_3nf (
    name VARCHAR(100) NOT NULL,
    alpha3 CHAR(3) PRIMARY KEY, -- 使用 alpha3 作為 PK
    alpha2 CHAR(2),
    country_code INT,
    iso3166_2 VARCHAR(20),

    region_code INT,
    subregion_code INT,
    intermediate_region_code INT,

    FOREIGN KEY (region_code) REFERENCES regions(region_code),
    FOREIGN KEY (subregion_code) REFERENCES subregions(subregion_code),
    FOREIGN KEY (intermediate_region_code) REFERENCES intermediate_regions(intermediate_region_code)
);
INSERT IGNORE INTO countries_3nf (
    name, alpha3, alpha2, country_code, iso3166_2,
    region_code, subregion_code, intermediate_region_code
)
SELECT 
    name, alpha3, alpha2, country_code, iso_3166_2,
    region_code, sub_region_code, intermediate_region_code
FROM data2;

-- D. 最終清理與數據一致性檢查

-- 確保 Data1 只保留在 Countries_3NF 中存在的國家
DELETE FROM data1
WHERE Code NOT IN (
    SELECT alpha3 FROM countries_3nf
);

-- E. 刪除臨時表格
DROP TABLE IF EXISTS data2;

-- (data_audit 表格的創建可以保留，但它與核心數據 ETL 無直接關係)
CREATE TABLE IF NOT EXISTS data_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_entity VARCHAR(100) NOT NULL,
    data_year INT NOT NULL,
    old_value DECIMAL(8,4),
    new_value DECIMAL(8,4),
    operation_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    user_id INT,
    operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id)
);