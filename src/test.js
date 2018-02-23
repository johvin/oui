// 本脚本用于测试 mysql affectedRows, changedRows 的计数原则
const db = require('./db');

const conn = db.getConnection();

conn.query(`insert into oui.oui_org (oui, org_name, org_addr_street, org_addr_province_or_city, org_addr_country) values ('abc', 'aaa', 'bbb', 'ccc', 'fff'), ('abd', 'aaa', 'bbb', 'ccc', 'fff') on duplicate key update org_name = values(org_name), org_addr_street =values(org_addr_street), org_addr_province_or_city=values(org_addr_province_or_city), org_addr_country=values(org_addr_country)`, (err, ret) => {
  conn.end();
  console.log(ret);
  process.exit(0);
});