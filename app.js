// INCLUDES
const express = require('express');
const app = express();
const port = 80;
const mongoose = require('mongoose');
const favicon = require('serve-favicon');

function combineSalesForSameMonth(comics){
    var comicsCombined = new Array(comics.length);
    comics.forEach(function(comics, index, arr){
        if(typeof arr[index - 1] !== 'undefined'){
            if(comics.month === arr[index - 1].month && comics.year === arr[index - 1].year){
                arr[index - 1].sales = arr[index - 1].sales + comics.sales;
            }else{
                comicsCombined[index] = comics;
            }
        }else{
            comicsCombined[index] = comics;
        }
    })
    return comicsCombined;
}

// CONFIG
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/favicon.ico'));
mongoose.connect("mongodb://admin:Password123!@localhost:27017/comika", {useNewUrlParser: true, useUnifiedTopology: true });

// SCHEMA & MODEL
let comicSchema = new mongoose.Schema({
    title: String,
    price: Number,
    publisher: String,
    sales: Number,
    month: Number,
    year: Number
});

let Comic = mongoose.model('Comic', comicSchema);

// ROUTES
app.get('/', function (req, res) {
    res.render('index');
});

app.get('/search', function (req, res) {
    let perPage = 10;
    let totalResults = 0;
    let page = Math.max(0, req.query.p);
    if(isNaN(page)){
        page = 0;
    }
    let searchTerms = req.query.q;

    if(!searchTerms){
        res.redirect('/');
    }else{
        //First aggregate without filtering results
        Comic.aggregate([
            {"$match": {"title": {$regex: new RegExp("^" + searchTerms.toLowerCase(), "i")} }},
            {"$group":{"_id":"$title","doc":{"$first":"$$ROOT"}}},
            {"$replaceRoot":{"newRoot":"$doc"}}
            ])
            .exec(function(err, comic) {
                if(err){
                    console.log(err);
                }else{
                    //Count unfiltered results
                    comic.forEach(function(comic) {
                        totalResults++;
                    });
                    //Now aggregate filtered results for display
                    Comic.aggregate([
                        {"$match": {"title": {$regex: new RegExp("^" + searchTerms.toLowerCase(), "i")} }},
                        {"$group":{"_id":"$title","doc":{"$first":"$$ROOT"}}},
                        {"$replaceRoot":{"newRoot":"$doc"}},
                        {"$sort": {"title": 1}},
                        {"$skip": perPage * page},
                        {"$limit": perPage}
                        ])
                        .exec(function(err, comic) {
                            if(err){
                                console.log(err);
                            }else{
                                res.render('search', {
                                    comic: comic,
                                    searchTerms: searchTerms,
                                    page: page,
                                    pages: Math.floor(totalResults / perPage)
                                });
                            }
                        })
                }
            })
        }
});

app.get('/sales/:comicId', function (req, res) {
    //Find comic
    Comic.findById({_id: req.params.comicId}, function(err, comic){
        if(err){
            console.log(err);
            res.redirect('/');
        }else{
            //Find all records for that comic
            Comic.find({title: comic.title}).sort({"year": 1, "month": 1}).exec(function(err, comics){
                if(err){
                    console.log(err);
                }else{
                    var comicsCombined = combineSalesForSameMonth(comics);
                    res.render('comic', {comic:comic, comics:comicsCombined});
                }
            })
        }
    })
});

app.get ('*', function (req, res) {
    res.render('index');
});

// LISTEN
app.listen(port, () => console.log(`Now listing on port ${port}!`));



