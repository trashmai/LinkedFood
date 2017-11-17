// jQuery init
var $f = jQuery.noConflict();

// rdflib.js namespace init
var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var XSD = $rdf.Namespace("http://www.w3.org/2001/XMLSchema#");
var OG = $rdf.Namespace("http://ogp.me/ns#");
var SCHEMA = $rdf.Namespace("http://schema.org/");
var TAPCROP = $rdf.Namespace("http://tap.linkedopendata.tw/resource/Crop/");
var TAPTAP = $rdf.Namespace("http://tap.linkedopendata.tw/resource/TraceableAgriculturalProduct/");
var TAP = $rdf.Namespace("http://tap.linkedopendata.tw/");


function queryQueue() {

    var thisQueue = this;

    this.items = [];
    this.process = {};
    this.process.running = 0;

    this.push = function(endpoint, sparql) {

        if (thisQueue.process.running) throw "You can't add query to queue while query running.";

        if (!this.process[endpoint]) this.process[endpoint] = {};
        if (!this.items[endpoint]) this.items[endpoint] = [];

        this.process[endpoint].running = 0;
        var query = {
            sparql: sparql
        };

        this.items[endpoint].push(query);

    }

    this.setCallbackOnDoneOpt = function(opts) {
        if (thisQueue.process.running) throw "You can't set callback while query running.";
        thisQueue.callbackOnDoneOpt = opts;
    }


    this.process_end = function(endpoint) {
        thisQueue.process.running -= 1;
        thisQueue.process[endpoint].running -= 1;
        var item = thisQueue.items[endpoint].shift();
        if (!thisQueue.process[endpoint].running && !!item) {
            thisQueue.process.running += 1;
            thisQueue.process[endpoint].running += 1;
            $lf.queryRemoteKB(endpoint, item.sparql, true, thisQueue)
        }

        if (!thisQueue.process.running) {

            if ($f('#blind').length == 1) {
                $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">All Query finished!!</div>');
            } else {
                console.log('All Query finished!!');
            }

            if ($f('#blind').length == 1) {
                $f('#blind').removeClass('loading');
            }

            if (!!thisQueue.callbackOnDoneOpt && !!thisQueue.callbackOnDoneOpt.func) {
                thisQueue.callbackOnDoneOpt.func(thisQueue.callbackOnDoneOpt.args);
            }
        }

    }

    this.run = function() {
        if (thisQueue.process.running) throw "You can't run query while other query running.";
        for (var ep in thisQueue.items) {
            if (thisQueue.items.hasOwnProperty(ep)) {
                var item = thisQueue.items[ep].shift();

                if (!thisQueue.process[ep].running && !!item) {
                    if ($f('#blind').length == 1) {
                        $f('#blind').addClass('loading');
                    }
                    thisQueue.process.running += 1;
                    thisQueue.process[ep].running += 1;
                    $lf.queryRemoteKB(ep, item.sparql, true, thisQueue)
                }

            }
        }

    }

}

(function() {

    window.$lf = $lf = {};

    $lf.mapLocation = {};

    $lf.mapLocation.custom_lat = 25.05682;
    $lf.mapLocation.custom_long = 121.6110439;
    $lf.mapLocation.custom_zoom = 13;

    if (!!navigator.geolocation && false) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                $lf.mapLocation.lat = position.coords.latitude;
                $lf.mapLocation.long = position.coords.longitude;
                console.log("Get coordinates!");
            },
            function(error) {
                $lf.mapLocation.lat = $lf.mapLocation.custom_lat;
                $lf.mapLocation.long = $lf.mapLocation.custom_long;
                console.log(error);
            }
        );
    } else {
        $lf.mapLocation.lat = $lf.mapLocation.custom_lat;
        $lf.mapLocation.long = $lf.mapLocation.custom_long;
    }
    $lf.mapLocation.zoom = $lf.mapLocation.custom_zoom;

    $lf.ingredients = [];
    $lf.taps = [];

    $lf.kb = $rdf.graph();
    $lf.fetcher = $rdf.fetcher($lf.kb, 10, false);

    $lf.parseRDF = function(str, base, contentType) {
        if (!str || typeof str != 'string') return;
        // add fallback for callback
        $rdf.parse(str, $lf.kb, base, contentType, function(sth, kb) {
            console.log("jsonld triple callback");
            console.log(sth);
            console.log(kb);

        });
    }

    $lf.convertRDF = function(str, base, fromContentType, toContentType = 'text/turtle', _callback) {
        if (!str || typeof str != 'string') return;
        var tmpKB = $rdf.graph();
        $rdf.parse(str, tmpKB, base, fromContentType);
        $rdf.serialize(undefined, tmpKB, base, toContentType, _callback);
    }


    $lf.queryLocalKB = function(sparql, options = {
        itr_callback: null,
        fin_callback: null
            // other args...
    }) {
        if ($f('#blind').length == 1) {
            $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">本地資料查詢中...</div>');
            $f('#blind').addClass('loading');
        }
        var test = true;
        var q = $rdf.SPARQLToQuery(sparql, test, $lf.kb);

        var options = options;
        var results = [];

        var itr_callback = function(res) {
            if (typeof options.itr_callback == 'function') {
                res = options.itr_callback(res, options);
            }
            results.push(res);
        }

        var fin_callback = function() {
            if (typeof options.fin_callback == 'function') {
                results = options.fin_callback(results, options);
            }
            //console.log([a, b, c]);
            if ($f('#blind').length == 1) {
                $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">本地資料查詢完成.</div>');
                $f('#blind').removeClass('loading');
            }
            console.log(results);
            console.log(5566);
        }

        $lf.kb.query(q,
            itr_callback,
            $lf.fetcher,
            fin_callback
        );
    }

    $lf.microdata2nt = function(item, uri, tamper) {
        var uri = uri;
        var triples = [];
        if (!uri) {
            var sbj_ = $lf.page_url.split('#')[0];
        } else {
            var sbj_ = uri;
        }

        item.type.forEach(function(t) {
            $lf.kb.add($rdf.sym(sbj_), RDF('type'), $rdf.sym(t));
            triples.push({
                s: sbj_,
                p: 'type',
                o: t
            });
        })

        for (var prop in item.properties) {
            if (item.properties.hasOwnProperty(prop)) {

                if ($f.isFunction(tamper.p)) {
                    var tampered_prop = tamper.p(prop);
                }

                item.properties[prop].forEach(function(obj) {

                    if (typeof obj != 'object') {
                        obj_ = obj.replace(/\n/g, ' ').replace(/ +/g, ' ').trim();

                        if ($f.isFunction(tamper.o)) {
                            obj_ = tamper.o(tampered_prop, obj_);
                        }

                        $lf.kb.add($rdf.sym(sbj_), SCHEMA(prop), obj_);
                        triples.push({
                            s: sbj_,
                            p: prop,
                            o: obj_
                        });

                        if (tampered_prop.value != SCHEMA(prop).value) {
                            $lf.kb.add($rdf.sym(sbj_), tampered_prop, obj_);
                            triples.push({
                                s: sbj_,
                                p: tampered_prop.value,
                                o: obj_
                            });
                        }

                    } else {
                        // bypass the weird statement in icook
                        if (false && !!obj.properties.url) {
                            obj.properties.url.forEach(function(o) {
                                obj_ = o;
                                $lf.kb.add($rdf.sym(sbj_), SCHEMA(prop), $rdf.sym(obj_));
                                triples.push({
                                    s: sbj_,
                                    p: prop,
                                    o: obj_
                                });

                                if (tampered_prop.value != SCHEMA(prop).value) {
                                    $lf.kb.add($rdf.sym(sbj_), tampered_prop, $rdf.sym(obj_));
                                    triples.push({
                                        s: sbj_,
                                        p: tampered_prop.value,
                                        o: obj_
                                    });
                                }

                                $lf.microdata2nt(obj, o, tamper);

                            })
                        } else {
                            // should handle new statement with/without uri (bnode)
                            if (!window.blankNodeCount) window.blankNodeCount = 0;

                            var blank = "_:b" + window.blankNodeCount;
                            window.blankNodeCount++;

                            $lf.kb.add($rdf.sym(sbj_), SCHEMA(prop), $rdf.sym(blank));
                            triples.push({
                                s: sbj_,
                                p: prop,
                                o: blank
                            });

                            if (tampered_prop.value != SCHEMA(prop).value) {
                                $lf.kb.add($rdf.sym(sbj_), tampered_prop, $rdf.sym(blank));
                                triples.push({
                                    s: sbj_,
                                    p: tampered_prop.value,
                                    o: blank
                                });
                            }

                            for (prop_of_blank in obj.properties) {
                                if (!obj.properties.hasOwnProperty(prop_of_blank)) continue;
                                obj.properties[prop_of_blank].forEach(function(o) {
                                    obj_of_blank = o;
                                    $lf.kb.add($rdf.sym(blank), SCHEMA(prop_of_blank), $rdf.sym(obj_of_blank));
                                    triples.push({
                                        s: blank,
                                        p: prop_of_blank,
                                        o: obj_of_blank
                                    });

                                    if (tampered_prop.value != SCHEMA(prop_of_blank).value) {
                                        $lf.kb.add($rdf.sym(blank), tampered_prop, $rdf.sym(obj_of_blank));
                                        triples.push({
                                            s: blank,
                                            p: tampered_prop.value,
                                            o: obj_of_blank
                                        });
                                    }

                                    $lf.microdata2nt(obj, blank, tamper);

                                })
                            }
                        }
                    }
                });
            }
        }
        console.log(triples);
    }

    $lf.parseMicroData = function(tamper = {
        s: null,
        p: null,
        o: null
    }, dom) {
        // code borrowed from OpenLink Structured Data Sniffer
        if (!dom) {
            var dom = document;
        }
        var micro_items = $f('[itemscope]', dom).not($f('[itemscope] [itemscope]', dom));
        var microdata = jQuery.microdata.json(micro_items, function(o) {
            return o;
        });

        microdata.items.forEach(function(item) {
            $lf.microdata2nt(item, null, tamper);
        })

    }

    $lf.queryRemoteKB = function(endpoint, sparql, save = false, queue = null) {
        var ep = endpoint;
        var save = save;

        if ($f('#blind').length == 1) {
            $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">正送出 SPARQL 至: ' + endpoint + ' ...</div>');
        }

        /*// some cache mechanism
        // var queryID = md5(endpoint + '+' + sparql);
        // var queryRes = localStorage.getItem(queryID);
        var queryRes = null; // manually turn off custom cache

        if (!!queryRes) {

            queryRes = JSON.parse(queryRes);
            var rdf = queryRes.rdf;
            var mime = queryRes.mime;
            $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">對: ' + endpoint + ' 做了快取!</div>');
            $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">快取回傳 ' + mime + ' 格式 (' + rdf.length + ' bytes)</div>');
            console.log("我要存檔啦");
            $lf.parseRDF(rdf, $lf.page_url, mime);

            if (queue) {
                queue.process_end(endpoint);
            }

        } else {
        //*/

        $f.get(endpoint, {
            query: sparql
        }).done(function(data, status, xhr) {
            var mime = xhr.getResponseHeader("content-type").split(';')[0];
            if (mime == "application/rdf+xml") {
                var rdf = '<?xml version="1.0" encoding="utf-8"?>\n' + data.documentElement.outerHTML;
                // console.log(rdf);
            } else {
                rdf = data;
            }

            if ($f('#blind').length == 1) {
                $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">對: ' + endpoint + ' 的查詢已完成!</div>');
                $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">來源回傳 ' + mime + ' 格式 (' + rdf.length + ' bytes)</div>');
            }

            /*** manually turn off custom cache
            $lf.convertRDF(rdf, $lf.page_url, mime, 'text/turtle', function(err, str) {
                if (!err) {
                    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">對: ' + endpoint + ' 的查詢已完成，並已對結果快取!</div>');
                    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">來源回傳 ' + mime + ' 格式 (' + rdf.length + ' bytes)</div>');
                    localStorage.setItem(queryID, JSON.stringify({
                        rdf: str,
                        mime: 'text/turtle'
                    }));
                } else {
                    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">對: ' + endpoint + ' 的查詢已完成，但快取失敗!</div>');
                    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">來源回傳 ' + mime + ' 格式 (' + rdf.length + ' bytes)</div>');
                    console.log(err);
                }
            });
            //*/


            if (save && (['application/rdf+xml', 'text/turtle', 'text/n3', 'application/n-triples', 'application/ld+json'].indexOf(mime) > -1)) {
                $lf.parseRDF(rdf, $lf.page_url, mime.split(";")[0]);
                if ($f('#blind').length == 1) {
                    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">查詢結果已合併於本地端.</div>');
                } else {
                    console.log("我要存檔啦");
                }
            } else if (save) {
                console.log("目前無法處理這個content type，不能存啦!")
            }

            if (queue) {
                queue.process_end(endpoint);
            }

        });
        // } // end of no cache code according to the commented else
    }

    $lf.getIngredientsFromLocal = function(reset = true) {

        if (reset) $lf.ingredients = [];

        var ingr_prop = SCHEMA('ingredients');
        var stats = $lf.kb.statementsMatching(undefined, ingr_prop);
        stats.forEach(function(stat) {
            $lf.ingredients.push(stat.object);
        });

        // so unexpected
        var ingr_prop = SCHEMA('recipeIngredient');
        var stats = $lf.kb.statementsMatching(undefined, ingr_prop);
        stats.forEach(function(stat) {
            $lf.ingredients.push(stat.object);
        });

        var extended_prop = RDF('type');
        var stats = $lf.kb.statementsMatching(undefined, extended_prop, TAP('Crop'));
        stats.forEach(function(stat) {
            $lf.ingredients.push(stat.subject);
        });

        console.log($lf.ingredients);
        return $lf.ingredients;
    }

    $lf.generate_sparql_get_tap_by_ingredients = function() {
        var iris = [];
        var all_characters = [];
        $lf.ingredients.forEach(function(ingr) {
            iris.push('<' + ingr.value + '>');
            var last_part = ingr.value.split('/').pop();
            var characters = last_part.split('');
            characters.forEach(function(c) {
                if (all_characters.indexOf(c) == -1) {
                    all_characters.push(c);
                }
            });
        });

        var filtered_characters = all_characters.filter(function(c) {
            if (!!c.match(/[ -~]/)) {
                return false;
            }
            return true;
        })

        var filters_regexp = filtered_characters.join('|');
        var filters_in = iris.join(',');

        var sparql = `
            prefix tap: <http://tap.linkedopendata.tw/>
            prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            prefix vCard: <http://www.w3.org/2006/vcard/>
            construct {
                ?tap a tap:TraceableAgriculturalProduct.
                ?tap tap:referTo ?o.
                ?o a tap:Crop.
                ?tap tap:operationDetail ?op_detail.
                ?tap tap:processDetail ?prc_detail.
                ?tap tap:certificateDetail ?cert_detail.
                ?tap tap:isCertifiedBy ?cert_by.
                ?tap tap:isProducedBy ?prod_by.
            }
            where {
                ?tap a tap:TraceableAgriculturalProduct.
                ?tap tap:referTo ?o.
                # filter (?o in (` + filters_in + `)).
                filter regex (str(?o), '` + filters_regexp + `').
                ?tap tap:operationDetail ?op_detail.
                ?tap tap:processDetail ?prc_detail.
                ?tap tap:certificateDetail ?cert_detail.                    
                ?tap tap:isCertifiedBy ?cert_by.
                ?tap tap:isProducedBy ?prod_by.
                
            }                
        `;
        return sparql;
    }

    $lf.generate_sparql_get_store_by_ingredients = function() {
        var iris = [];
        var all_characters = [];
        $lf.ingredients.forEach(function(ingr) {
            iris.push('<' + ingr.value + '>');
            var last_part = ingr.value.split('/').pop();
            var characters = last_part.split('');
            characters.forEach(function(c) {
                if (all_characters.indexOf(c) == -1) {
                    all_characters.push(c);
                }
            });
        });

        var filtered_characters = all_characters.filter(function(c) {
            if (!!c.match(/[ -~]/)) {
                return false;
            }
            return true;
        })

        var filters_regexp = filtered_characters.join('|');
        var filters_in = iris.join(',');

        var sparql = `
            prefix tap: <http://tap.linkedopendata.tw/>
            prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            prefix vCard: <http://www.w3.org/2006/vcard/>
            construct {
                ?store a tap:Store.
                ?store tap:sell ?o.
                ?o a tap:Crop.
                ?store rdfs:label ?store_name.
                ?store vCard:hasAddress ?store_addr.
                ?store wgs84:lat ?store_lat.
                ?store wgs84:long ?store_long.
            }
            where {
                ?store a tap:Store.
                ?store tap:sell ?o.
                # filter (?o in (` + filters_in + `)).
                filter regex (str(?o), '` + filters_regexp + `').
                ?store rdfs:label ?store_name.
                ?store vCard:hasAddress ?store_addr.
                ?store wgs84:lat ?store_lat.
                ?store wgs84:long ?store_long.
            }                
        `;
        return sparql;
    }

    $lf.generate_sparql_get_chain_store_by_ingredients = function() {
        var iris = [];
        var all_characters = [];
        $lf.ingredients.forEach(function(ingr) {
            iris.push('<' + ingr.value + '>');
            var last_part = ingr.value.split('/').pop();
            var characters = last_part.split('');
            characters.forEach(function(c) {
                if (all_characters.indexOf(c) == -1) {
                    all_characters.push(c);
                }
            });
        });

        var filtered_characters = all_characters.filter(function(c) {
            if (!!c.match(/[ -~]/)) {
                return false;
            }
            return true;
        })

        var filters_regexp = filtered_characters.join('|');
        var filters_in = iris.join(',');

        var sparql = `
            prefix tap: <http://tap.linkedopendata.tw/>
            prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            prefix vCard: <http://www.w3.org/2006/vcard/>
            construct {
                ?store tap:is_chain_store "yes".
            }
            where {
                ?store a tap:Store.
                ?store tap:sell ?o.
                ?store tap:is_member_of ?chain_store.
                # filter (?o in (` + filters_in + `)).
                filter regex (str(?o), '` + filters_regexp + `').

            }                
        `;
        return sparql;
    }

    $lf.generate_sparql_get_rest_by_ingredients = function() {
        var iris = [];
        var all_characters = [];
        $lf.ingredients.forEach(function(ingr) {
            iris.push('<' + ingr.value + '>');
            var last_part = ingr.value.split('/').pop();
            var characters = last_part.split('');
            characters.forEach(function(c) {
                if (all_characters.indexOf(c) == -1) {
                    all_characters.push(c);
                }
            });
        });

        var filtered_characters = all_characters.filter(function(c) {
            if (!!c.match(/[ -~]/)) {
                return false;
            }
            return true;
        })

        var filters_regexp = filtered_characters.join('|');
        var filters_in = iris.join(',');

        var sparql = `
            prefix tap: <http://tap.linkedopendata.tw/>
            prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            prefix vCard: <http://www.w3.org/2006/vcard/>
            construct {
                ?rest a tap:Restaurant.
                ?rest tap:useCrop ?o.
                ?o a tap:Crop.
                ?rest rdfs:label ?rest_name.
                ?rest tap:dishName ?rest_dish.
                ?rest vCard:hasAddress ?rest_addr.
                ?rest wgs84:lat ?rest_lat.
                ?rest wgs84:long ?rest_long.
            }
            where {
                ?rest a tap:Restaurant.
                ?rest tap:useCrop ?o.
                # filter (?o in (` + filters_in + `)).
                filter regex (str(?o), '` + filters_regexp + `').
                ?rest rdfs:label ?rest_name.
                ?rest tap:dishName ?rest_dish.
                ?rest vCard:hasAddress ?rest_addr.
                ?rest wgs84:lat ?rest_lat.
                ?rest wgs84:long ?rest_long.
            }                
        `;
        return sparql;
    }

    $lf.generate_sparql_mapping_crop_name = function() {
        var iris = [];
        var all_names = [];
        $lf.ingredients.forEach(function(ingr) {
            iris.push('<' + ingr.value + '>');
            if (ingr.value.match(/^https?\/\//)) {
                var last_part = ingr.value.split('/').pop();
            } else {
                var last_part = ingr.value.split(' ')[0];
            }

            var filtered_name = last_part.split('').filter(function(c) {
                if (!!c.match(/[ -~]/)) {
                    return false;
                }
                return true;
            }).join('');

            if (all_names.indexOf(filtered_name) == -1) {
                if (filtered_name.length > 0)
                    all_names.push(filtered_name);
            }

        });

        var filters_regexp = all_names.join('|');
        if (filters_regexp.length == 0) filters_regexp = "Lorem Ipsum";

        var sparql = `
            prefix tap: <http://tap.linkedopendata.tw/>
            prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            prefix vCard: <http://www.w3.org/2006/vcard/>
            prefix owl: <http://www.w3.org/2002/07/owl#>
            construct {
                ?o a tap:Crop.
                ?o rdfs:label ?crop_name.
            }
            where {
                ?crop a tap:Crop.
                ?crop rdfs:label ?crop_name.
                filter regex (?crop_name, '` + filters_regexp + `').
                ?crop owl:sameAs ?o.
            }
        `;
        return sparql;
    }

    $lf.generate_sparql_get_jp_crop_prod_place_by_ingredients = function() {
        var iris = [];
        var all_names = [];

        $lf.ingredients.forEach(function(ingr) {
            if (ingr.termType == "NamedNode") {
                iris.push('<' + ingr.value + '>');
            }
        });

        if (iris.length == 0) iris.push("<http://example.org/Lorem_Ipsum>");
        iris_string = '(' + iris.join(',') + ')';

        var sparql = `
            prefix tap: <http://tap.linkedopendata.tw/>
            prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            prefix wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            prefix vCard: <http://www.w3.org/2006/vcard/>
            prefix owl: <http://www.w3.org/2002/07/owl#>
            construct {
                ?place a tap:Place.
                ?o tap:plantAt ?place.
                ?o a tap:Crop.
                ?place rdfs:label ?placename.
                ?place wgs84:lat ?place_lat.
                ?place wgs84:long ?place_long.
            }
            where {
                ?crop tap:plantAt ?place.
                ?place a tap:Place.
                ?place rdfs:label ?placename.
                ?crop owl:sameAs ?o.
                filter (?o IN ` + iris_string + `).
                ?place wgs84:lat ?place_lat.
                ?place wgs84:long ?place_long.
            }
        `;
        return sparql;
    }


    $lf.queryQueue = new queryQueue();

    $lf.queryAllTapsFromRemote = function() {
        if (!$lf.taps.length) {
            var sparql = $lf.generate_sparql_get_tap_by_ingredients();
            $lf.queryQueue.push("https://tap.linkedopendata.tw/sparql", sparql);
            $lf.queryQueue.setCallbackOnDoneOpt({
                func: function(args) {
                    var a = RDF('type');
                    var typeTAP = TAP('TraceableAgriculturalProduct');
                    var stats = $lf.kb.statementsMatching(undefined, a, typeTAP);
                    console.log(stats);
                },
                args: $lf.taps
            });
            $lf.queryQueue.run();
        }
    }

    $lf.mappingCropName = function(_callback, args = {}) {
        var sparql_jp_place = $lf.generate_sparql_mapping_crop_name();
        $lf.queryQueue.push("https://jp.linkedopendata.tw/sparql", sparql_jp_place);
        $lf.queryQueue.setCallbackOnDoneOpt({
            func: _callback,
            args: args
        });
        $lf.queryQueue.run();
    }

    $lf.queryTapsAndStoresAndRestsFromRemote = function(_callback, args = {}) {
        var sparql_tap = $lf.generate_sparql_get_tap_by_ingredients();
        var sparql_store = $lf.generate_sparql_get_store_by_ingredients();
        var sparql_chain_store = $lf.generate_sparql_get_chain_store_by_ingredients();
        var sparql_rest = $lf.generate_sparql_get_rest_by_ingredients();
        var sparql_jp_place = $lf.generate_sparql_get_jp_crop_prod_place_by_ingredients();
        $lf.queryQueue.push("https://tap.linkedopendata.tw/sparql", sparql_tap);
        $lf.queryQueue.push("https://store.linkedopendata.tw/sparql", sparql_store);
        $lf.queryQueue.push("https://store.linkedopendata.tw/sparql", sparql_chain_store);
        $lf.queryQueue.push("https://rest.linkedopendata.tw/sparql", sparql_rest);
        $lf.queryQueue.push("https://jp.linkedopendata.tw/sparql", sparql_jp_place);
        $lf.queryQueue.setCallbackOnDoneOpt({
            func: _callback,
            args: args
        });
        $lf.queryQueue.run();
    }

    $lf.getGeoLocation = function(reset = false, _callback) {

        if (!reset) {
            if (typeof _callback == 'function') {
                _callback($lf.mapLocation.lat, $lf.mapLocation.long);
            }
        } else {
            $lf.mapLocation.zoom = $lf.mapLocation.custom_zoom;
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    $lf.mapLocation.lat = position.coords.latitude;
                    $lf.mapLocation.long = position.coords.longitude;
                    if (typeof _callback == 'function') {
                        _callback($lf.mapLocation.lat, $lf.mapLocation.long);
                    }
                },
                function() {
                    $lf.mapLocation.lat = $lf.mapLocation.custom_lat;
                    $lf.mapLocation.long = $lf.mapLocation.custom_long;
                    if (typeof _callback == 'function') {
                        _callback($lf.mapLocation.lat, $lf.mapLocation.long);
                    }
                }
            );
        }

    }

    $lf.showMap = function(mapid) {
        $lf.mapid = mapid;
        if (!window.map) window.map = {};
        $lf.getGeoLocation(false, function(lat, lng) {
            if (!window.map[mapid]) {
                $lf.map_layer = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
                window.map[mapid] = L.map(mapid).setView([lat, lng], $lf.mapLocation.zoom).addLayer($lf.map_layer);;
                window.map[mapid].on('moveend', onMoveEnd);
            } else {
                window.map[mapid].setView([lat, lng], $lf.mapLocation.zoom);
            }
        });
    }

    $lf.queryStoresByIngredientFromLocal = function(ingredient, options) {
        if (typeof ingredient !== 'Object') {
            ingredient = TAPCROP(ingredient);
        }
        if (!$lf.queryQueue.process.running) {

            var lat = options.args.center.lat;
            var long = options.args.center.lng;

            var offset = 0.01;
            var lat_min = options.args.boundary[0];
            var long_min = options.args.boundary[1];
            var lat_max = options.args.boundary[2];
            var long_max = options.args.boundary[3];

            $lf.queryLocalKB(`
                PREFIX tap: <http://tap.linkedopendata.tw/>
                PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                SELECT ?target ?lat ?long WHERE {
                    ?target tap:sell ` + $lf.toIRI(ingredient.value) + `.
                    ?target ?p ?o.
                    ?target wgs84:lat ?lat.
                    ?target wgs84:long ?long.
                    FILTER (?long > ` + long_min + `).
                    FILTER (?long < ` + long_max + `).
                    FILTER (?lat > ` + lat_min + `).
                    FILTER (?lat < ` + lat_max + `).
                }
            `, options);

        }

    }

    $lf.queryRestsByIngredientFromLocal = function(ingredient, options) {
        if (typeof ingredient !== 'Object') {
            ingredient = TAPCROP(ingredient);
        }
        if (!$lf.queryQueue.process.running) {

            var lat = options.args.center.lat;
            var long = options.args.center.lng;

            var offset = 0.01;
            var lat_min = options.args.boundary[0];
            var long_min = options.args.boundary[1];
            var lat_max = options.args.boundary[2];
            var long_max = options.args.boundary[3];

            $lf.queryLocalKB(`
                PREFIX tap: <http://tap.linkedopendata.tw/>
                PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                SELECT ?target ?lat ?long WHERE {
                    ?target tap:useCrop ` + $lf.toIRI(ingredient.value) + `.
                    ?target ?p ?o.
                    ?target wgs84:lat ?lat.
                    ?target wgs84:long ?long.
                    FILTER (?long > ` + long_min + `).
                    FILTER (?long < ` + long_max + `).
                    FILTER (?lat > ` + lat_min + `).
                    FILTER (?lat < ` + lat_max + `).
                }
            `, options);

        }

    }

    $lf.queryProdPlacesByIngredientFromLocal = function(ingredient, options) {
        if (typeof ingredient !== 'Object') {
            ingredient = TAPCROP(ingredient);
        }
        if (!$lf.queryQueue.process.running) {

            var lat = options.args.center.lat;
            var long = options.args.center.lng;

            var offset = 0.01;
            var lat_min = options.args.boundary[0];
            var long_min = options.args.boundary[1];
            var lat_max = options.args.boundary[2];
            var long_max = options.args.boundary[3];

            $lf.queryLocalKB(`
                PREFIX tap: <http://tap.linkedopendata.tw/>
                PREFIX wgs84: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                SELECT ?target ?lat ?long WHERE {
                    ` + $lf.toIRI(ingredient.value) + ` tap:plantAt ?target.
                    ?target ?p ?o.
                    ?target wgs84:lat ?lat.
                    ?target wgs84:long ?long.
                    FILTER (?long > ` + long_min + `).
                    FILTER (?long < ` + long_max + `).
                    FILTER (?lat > ` + lat_min + `).
                    FILTER (?lat < ` + lat_max + `).
                }
            `, options);
        }
    }

    function onMoveEnd(e) {
        var latlng = e.target.getCenter();
        $lf.mapLocation.lat = latlng.lat;
        $lf.mapLocation.long = latlng.lng;
        $lf.mapLocation.zoom = e.target.getZoom();
        console.log(latlng);
    }


    $lf.getMapCenter = function(mapid) {
        if (!!window.map[mapid]) {
            var center = window.map[mapid].getCenter();
        } else {
            var center = {
                lat: $lf.mapLocation.custom_lat,
                lng: $lf.mapLocation.custom_long
            };
        }
        return center;
    }

    $lf.getMapBoundary = function(mapid) {
        var center = $lf.getMapCenter();
        if (!!window.map[mapid]) {
            var boundary = [window.map[mapid].getBounds()._southWest.lat, window.map[mapid].getBounds()._southWest.lng, window.map[mapid].getBounds()._northEast.lat, window.map[mapid].getBounds()._northEast.lng];
        } else {
            var boundary = [center.lat - 0.01, center.lng - 0.01, center.lat + 0.01, center.lng + 0.01];
        }
        return boundary;
    }


    $lf.toIRI = function(uri) {
        return '<' + uri + '>';
    }

}());