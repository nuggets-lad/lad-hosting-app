CREATE OR REPLACE VIEW website_position_summary AS
WITH latest_ranks AS (
    SELECT
        keyword_id,
        position,
        ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY date DESC) as rn
    FROM
        seo_daily_ranks
)
SELECT
    k.website_id,
    COUNT(CASE WHEN lr.position BETWEEN 1 AND 3 THEN 1 END) AS pos_1_3,
    COUNT(CASE WHEN lr.position BETWEEN 4 AND 5 THEN 1 END) AS pos_4_5,
    COUNT(CASE WHEN lr.position BETWEEN 6 AND 10 THEN 1 END) AS pos_6_10,
    COUNT(CASE WHEN lr.position BETWEEN 11 AND 30 THEN 1 END) AS pos_11_30,
    COUNT(CASE WHEN lr.position BETWEEN 31 AND 100 THEN 1 END) AS pos_31_100
FROM
    seo_keywords k
JOIN
    latest_ranks lr ON k.id = lr.keyword_id
WHERE
    lr.rn = 1
GROUP BY
    k.website_id;
