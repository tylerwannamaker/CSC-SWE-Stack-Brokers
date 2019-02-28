const fs = require('fs');
const JSON5 = require('json5');
const mysql = require('mysql');
const info = require('../stockconfig/info.json');
const parser = require('../stock_modules/stocktools');
const si = require('stock-info');
//Read config file
const configinfo = JSON5.parse(fs.readFileSync('./stockconfig/config', 'utf8'));
const dbhost = configinfo.dbhost.toString(), dbuser=configinfo.dbuser.toString(), dbpass=configinfo.dbpass.toString(), dbport=configinfo.dbport.toString();

const connection = mysql.createConnection({
    host: dbhost,
    user: dbuser,
    password: dbpass,
    port: dbport
});

//Connect to local database, initialize databases
exports.connectdb = function(){
    connection.connect(function(err) {
        if (err) {
            console.error('X Database connection failed: ' + err.stack);
        }else
        console.log('✓ Connected to MySQL.');
    });

    connection.query("CREATE DATABASE IF NOT EXISTS StackBrokersDB;", function (err, result){
       if (err) throw err;
       else
            console.log("✓ Database");
    });
    connection.query("USE StackBrokersDB;");
    connection.query("CREATE TABLE IF NOT EXISTS StockTable(ticker VARCHAR(10) PRIMARY KEY, name VARCHAR(35), industry VARCHAR(16), stockcurrent FLOAT, projected FLOAT);", function (err, result){
        if (err) throw err;
        else
            console.log("✓ Stock Table");
    });
    connection.query("CREATE TABLE IF NOT EXISTS ArticleTable(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ticker VARCHAR(10), time INT, title VARCHAR(100), URL VARCHAR(200), sentiment FLOAT, FOREIGN KEY (ticker) REFERENCES StockTable(ticker));", function (err, result){
        if (err) throw err;
        else {
            console.log("✓ Article Table");
            //Place stock updating at last DB connection process
           //
            let CurrentDate = new Date();
            CurrentDate = parser.parseDate(CurrentDate);
            var sql = "SHOW COLUMNS FROM stocktable LIKE '"+CurrentDate+"';";
            connection.query(sql, function (err, result) {
                if (err) throw err;
                console.log((result.length==0) ? "Creating Stocks...":"Updating Stocks...");

                let stocklist = info.TechStocks;
                if(result.length==0){
                    //Day col doesn't exist, create one
                    connection.query("ALTER TABLE stocktable ADD "+CurrentDate+" INT;");
                    si.getStocksInfo(stocklist).then(
                        stocklist => {
                            for (stock in stocklist) {
                                connection.query('INSERT INTO stocktable (ticker, name, industry, stockcurrent, projected, ' +  CurrentDate + ') VALUES ("' + stocklist[stock].symbol + '", "' + stocklist[stock].shortName + '", "TECH", ' + stocklist[stock].regularMarketPrice + ', -0.5,' + stocklist[stock].regularMarketPrice + ');');
                            }

                        })
                        .catch(error => {
                            console.log("Error when updating "+error)
                        });
                    updateStocks();
                }else{
                    //Day col exists, update
                    updateStocks();
                }
            });

        }
    });


    //connection.end();
};
exports.grabtable = function(tableName, res){
    let statement = "SELECT * FROM " + tableName;
    connection.query(statement, function(err, results) {
        if (err)
            throw err;
        res.send(results);
    });
};
exports.grabStockInfo = function(tableName, ticker, res){
    let statement = "SELECT * FROM "+tableName+" WHERE ticker='" + ticker +"';";
    connection.query(statement, function(err, results) {
        if (err)
            throw err;
        if (results.toString()==''){
            res.send("Stock not found");
            return;
        }
        res.send(results);
    });
};

function updateStocks(){
    let CurrentDate = new Date();
    CurrentDate = parser.parseDate(CurrentDate);
        let stocklist = info.TechStocks;

        si.getStocksInfo(stocklist).then(
            stocklist => {
                for (stock in stocklist) {

                console.log("Updating "+stocklist[stock].shortName+" : "+stocklist[stock].symbol);
                connection.query('UPDATE stocktable SET stockcurrent = '+stocklist[stock].regularMarketPrice+', '+CurrentDate+'= '+stocklist[stock].regularMarketPrice+' WHERE TICKER = "'+stocklist[stock].symbol+'";');
            }

            })
            .catch(error => {console.log("Error when updating: "+error)});

}

exports.updateStocks = function updateStocks(){
    updateStocks();
};

