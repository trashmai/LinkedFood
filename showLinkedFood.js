// React when the browser action's icon is clicked.

// Regex-pattern to check URLs against. 
// It matches URLs like: http[s]://[...]stackoverflow.com[...]
var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?(icook\.tw|taibon\.tw|cookpad\.com)/;

// When the browser-action button is clicked...

// A function to use as callback
function doStuffWithDom(domContent) {

    // testing rdflib.js
    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">測試：正在解析頁面中的 RDFa 資訊</div>');
    $lf.parseRDF(domContent, window.$lf.page_url, 'text/html');

    //var foafKnows = FOAF('knows');
    //console.log(foafKnows);
    var og_desc = OG('description');
    var test_res = $lf.kb.statementsMatching(undefined, og_desc);
    console.log(test_res);
    if (test_res.length)
        $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">測試：RDFa og:description 為' + test_res[0].object.value + '</div>');

    // results are processed by callback functions
    // $lf.queryLocalKB("select ?s ?p ?o where {?s ?p ?o.}");

    // parsing microdata and tampering properties and objects
    function tamper_ingr2uri(prop, obj) {
        // if prop == ''
        if (prop.value == SCHEMA('ingredients').value) {
            obj = TAPCROP(obj.split(' ')[0].split('(')[0]);
        }
        return obj;
    }

    function tamper_schema_prop(prop) {
        var prop = prop.replace(RegExp('^' + SCHEMA().value), '', prop);
        // conditions
        return SCHEMA(prop);
        // else
        // return something else
    }

    var dom = document.createElement('html');
    dom.innerHTML = domContent;

    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">正在解析頁面中的 microdata...</div>');
    $lf.parseMicroData({
        p: tamper_schema_prop,
        o: tamper_ingr2uri
    }, dom);

    $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">正在解析頁面中的 json+ld...</div>');
    var jsonld_data = {};
    try {
        jsonld_data = JSON.parse($f('script[type="application/ld+json"', dom).text());
    } catch (err) {
        console.log(err.message);
    }

    // callback hell...
    jsonld.expand(jsonld_data,
        function(error, expanded) {
            if (error) {
                handle_error(error);
            } else {
                jsonld.toRDF(expanded, { format: 'application/nquads' },
                    function(error, nquads) {
                        if (error) {
                            handle_error(error);
                        } else {
                            // console.log(nquads);
                            $lf.parseRDF(nquads, $lf.page_url, "text/n3");

                            $lf.getIngredientsFromLocal();

                            $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">嘗試對應食材名稱...</div>');
                            $lf.mappingCropName(function() {
                                // get page ingredients for following query
                                $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">正在擷取食材名稱...</div>');
                                var ingrs = $lf.getIngredientsFromLocal();

                                // var sparql = $lf.generate_sparql_where_to_buy_tap();
                                // var sparql = $lf.generate_sparql_where_to_eat_tap();

                                // query remote knowledge base and / or save to local kb
                                // $lf.queryRemoteKB("//test.taibon.tw:3030/ds", sparql, true);
                                $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">準備 Federation SPARQL Query...</div>');
                                $lf.queryTapsAndStoresAndRestsFromRemote(
                                    function(args) {
                                        var a = RDF('type');
                                        var typeCrop = TAP('Crop');
                                        var crop_stats = $lf.kb.statementsMatching(undefined, a, typeCrop);
                                        //var typeTAP = TAP('TraceableAgriculturalProduct');
                                        //var tap_stats = $lf.kb.statementsMatching(undefined, a, typeTAP);
                                        //var typeStore = TAP('Store');
                                        //var store_stats = $lf.kb.statementsMatching(undefined, a, typeStore);
                                        //var typeRest = TAP('Restaurant');
                                        //var rest_stats = $lf.kb.statementsMatching(undefined, a, typeRest);
                                        //console.log(tap_stats);
                                        //console.log(store_stats);
                                        //console.log(rest_stats);
                                        //$lf.queryStoresByIngredientFromLocal('馬鈴薯');
                                        var crops = [];
                                        crop_stats.forEach(function(stat) {
                                            if (crops.indexOf(stat.subject.value)) {
                                                crops.push(stat.subject.value);
                                            }
                                        });

                                        var crops_w_similarity = [];
                                        crops.forEach(function(crop_uri) {
                                            var crop_name = crop_uri.split('#')[0].split('/').pop();

                                            // calculate similarity
                                            var chars_of_crop_name = crop_name.split('');
                                            var max_similarity = 0;
                                            var max_intersection = [];
                                            $lf.ingredients.forEach(function(ingr_node) {
                                                var ingr = ingr_node.value.split('/').pop()
                                                var chars_of_ingr = ingr.split('');
                                                var intersection = intersect(chars_of_crop_name, chars_of_ingr);
                                                var chars_of_crop_name_dummy = crop_name.split('');

                                                var similarity = 0;
                                                intersection.forEach(function(isct) {
                                                    similarity += ((chars_of_crop_name_dummy.indexOf(isct) + 1) / chars_of_crop_name.length);
                                                    if (chars_of_crop_name_dummy.indexOf(isct) > -1) {
                                                        chars_of_crop_name_dummy[chars_of_crop_name_dummy.indexOf(isct)] = '*^.<*';
                                                    }
                                                });

                                                similarity = similarity / ((chars_of_crop_name.length + 1) / 2);

                                                /*
                                                if (crop_name == '香菇') {
                                                    if (similarity > max_similarity) {
                                                        max_similarity = similarity;
                                                        max_intersection = intersection;
                                                    }
                                                }
                                                //*/

                                                if (similarity > max_similarity) {
                                                    max_similarity = similarity;
                                                    max_intersection = intersection;
                                                }
                                            });

                                            crops_w_similarity.push({
                                                uri: crop_uri,
                                                name: crop_name,
                                                similarity: max_similarity,
                                                intersection: max_intersection,
                                                chars: chars_of_crop_name
                                            })

                                        })

                                        crops_w_similarity.sort(function(a, b) {
                                            if (a.similarity > b.similarity) {
                                                return -1;
                                            } else if (a.similarity < b.similarity) {
                                                return 1;
                                            } else {
                                                if (a.chars.length > b.chars.length) {
                                                    return -1;
                                                } else if (a.chars.length < b.chars.length) {
                                                    return 1;
                                                }
                                            }
                                            return 0;
                                        })

                                        crops_w_similarity.forEach(function(crop) {
                                            var txt = '';
                                            crop.chars.forEach(function(char) {
                                                if (crop.intersection.indexOf(char) > -1) {
                                                    txt += ('<span class="highlight_txt">' + char + '</span>');
                                                } else {
                                                    txt += '<ffss>' + char + '<ffss>';
                                                }
                                            })
                                            txt = txt.replace(/<\/span><span.*?>/g, '');
                                            txt = txt.replace(/<ffss>/g, '');
                                            $f("#show_ingredients").append("<div data='" + crop.name + "' class='item'><div href='" + crop.uri + "' target='_blank'>" + txt + "</div></div>");
                                        });


                                        $f("#show_ingredients .item").click(function(e) {
                                            var et = $f(e.delegateTarget);

                                            $f("#show_ingredients .item").removeClass('selected');
                                            var crop_name = $lf.crop_name = et.attr('data')
                                            et.addClass('selected');

                                            //alert(crop_name);

                                            // show tap items
                                            var tap_stats = $lf.kb.statementsMatching(undefined, TAP('referTo'), TAPCROP(crop_name));
                                            var tap_contents = '';
                                            $f('#show_taps').children().remove();
                                            tap_stats.forEach(function(tap_stat) {
                                                var tap = tap_stat.subject.value;
                                                var tapcode = tap.split('/').pop();
                                                $f("#show_taps").append("<div data='" + tapcode + "' class='item'><div href='" + tap + "' target='_blank'>" + tapcode + "</div></div>");
                                            })

                                            $f('#tap_info .detail_area').remove();
                                            $f('#tap_info').html('<div>請先選擇一項產銷履歷~</div>');

                                            // let tap items have click listener 
                                            $f("#show_taps .item").click(function(e) {
                                                $f("#show_taps .item").removeClass('selected');
                                                $f('#tab-tap-info').children('a')[0].click();
                                                $f(e.delegateTarget).addClass('selected');
                                                var tap = TAPTAP($f(e.delegateTarget).attr('data'));
                                                console.log(tap);
                                                var clicked_tap_stats = $lf.kb.statementsMatching(tap);
                                                var cts_properties = {};
                                                clicked_tap_stats.forEach(function(cts) {
                                                    if (!cts_properties[cts.predicate.value]) cts_properties[cts.predicate.value] = [];
                                                    if (cts_properties[cts.predicate.value].indexOf(cts.object.value) == -1) {
                                                        cts_properties[cts.predicate.value].push(cts.object.value);
                                                    }
                                                });
                                                var tap_content = window.makePopupContents(cts_properties, null);
                                                $f('#tap_info').html(tap_content);
                                                $f('div.triple.object').click(function(e) {
                                                    if ($f(e.delegateTarget).attr('pred_local_name').match(/Detail$/)) {
                                                        $f(".detail").removeClass('selected');
                                                        $f(e.delegateTarget).addClass('selected');
                                                        $f('#blind').append('<div style="text-align:center; height:1.5em; margin-top:0.5em;">從遠端載入 ' + $f(e.delegateTarget).attr('pred_local_name') + ' 中...</div>');
                                                        $f('#blind').addClass('loading');
                                                        $f.getJSON(e.delegateTarget.textContent).done(function(_json) {
                                                            var isHeader = true;
                                                            var header = [];
                                                            var rows = [];
                                                            var details = '';
                                                            details += '<div class="css_table detail_area" style="margin-top:2em;">'
                                                            _json.forEach(function(jo) {
                                                                var row = [];
                                                                for (var p in jo) {
                                                                    if (jo.hasOwnProperty(p)) {
                                                                        if (isHeader) header.push(p);
                                                                        row.push(jo[p]);
                                                                    }
                                                                }
                                                                isHeader = false;
                                                                rows.push(row);
                                                            });
                                                            details += '<div class="css_tr"><div class="css_td">';
                                                            details += header.join('</div><div class="css_td" style="padding-left:2em;">');
                                                            details += '</div></div>';
                                                            rows.forEach(function(row) {
                                                                details += '<div class="css_tr"><div class="css_td">';
                                                                details += row.join('</div><div class="css_td" style="padding-left:2em;">');
                                                                details += '</div></div>';
                                                            });
                                                            details += '</div>';
                                                            $f('#tap_info .detail_area').remove();
                                                            $f('#tap_info').append(details);
                                                            $f('#blind').removeClass('loading');
                                                        });
                                                    }
                                                });
                                            });

                                            // query prices
                                            var weekTrendStartDay = moment().subtract(18, "month");
                                            weekTrendStartDay = weekTrendStartDay.format("YYYY/MM/DD");

                                            $f('#price_info').children().remove();
                                            $f('#price_info').append('<div>讀取中...</div>');

                                            $f.get('http://linkedopendata.tw/api/crop2id.php?crop=' + crop_name, function(crop_ids) {
                                                //$f('#price_info').children().remove();
                                                if (crop_ids.length == 0) {
                                                    $f('#price_info').children().remove();
                                                    $f('#price_info').append('<br/><div>查無資料</div>');
                                                } else {
                                                    $f('#price_info').children().remove();
                                                }
                                                crop_ids.forEach(function(crop_id) {
                                                    $f.get('https://www.twfood.cc/api/FarmTradeSumWeeks?filter={"order":"endDay asc","where":{"itemCode":"' + crop_id + '","startDay":{"gte":"' + weekTrendStartDay + '"}}}', function(_json) {
                                                        var thisWeek = _json[_json.length - 1];
                                                        var fullname = thisWeek.fullname;
                                                        var kgScore = (thisWeek.kgScore === null) ? '無資料' : thisWeek.kgScore;
                                                        var priceScore = (thisWeek.priceScore === null) ? '無資料' : thisWeek.priceScore;
                                                        var totalScore = (thisWeek.totalScore === null) ? '無資料' : thisWeek.totalScore;
                                                        var weekAvgPrice = thisWeek.avgPrice;
                                                        var startDay = thisWeek.startDay;
                                                        var endDay = thisWeek.endDay;

                                                        if (kgScore >= 0) {
                                                            kgClass = 'green';
                                                        } else {
                                                            kgClass = 'red';
                                                        }

                                                        if (priceScore >= 0) {
                                                            priceClass = 'green';
                                                        } else {
                                                            priceClass = 'red';
                                                        }

                                                        if (totalScore >= 0) {
                                                            totalClass = 'green';
                                                        } else {
                                                            totalClass = 'red';
                                                        }


                                                        var csv, weekAry = [],
                                                            avgPriceAry = [],
                                                            tonAry = [],
                                                            totalPriceSum = 0,
                                                            kgSum = 0,
                                                            generalAvgPrice = 0,
                                                            maxPrice = 0,
                                                            maxTon = 0;
                                                        _json.forEach(function(_col) {
                                                            _col.ton = _col.kg / 1000;
                                                            weekAry.push(_col.year + "/" + _col.week);
                                                            var _a = _col.endDay.split("/");
                                                            avgPriceAry.push([Date.UTC(_a[0], _a[1] - 1, _a[2]), _col.avgPrice]);
                                                            tonAry.push([Date.UTC(_a[0], _a[1] - 1, _a[2]), _col.ton]);
                                                            kgSum += _col.kg;
                                                            totalPriceSum += _col.totalPrice;
                                                            maxPrice = (_col.avgPrice > maxPrice) ? _col.avgPrice : maxPrice;
                                                            maxTon = (_col.ton > maxTon) ? _col.ton : maxTon;
                                                        });

                                                        generalAvgPrice = totalPriceSum / kgSum;

                                                        if (!!totalScore) {
                                                            $f('#price_info').append(`<div class='css_table' style='margin-top: 1em;'>
                                        <div class='css_tr'>
                                            <div class='css_td'>
                                                <div><a href='https://www.twfood.cc/search?q=` + encodeURIComponent(fullname) + `+` + crop_id + `'>` + fullname + `</a>：</div>
                                            </div>
                                            <div class='css_td'>
                                                <div>` + startDay + ` ~ ` + endDay + `</div>
                                            </div>
                                        </div>
                                        <div class='css_tr'>
                                            <div class='css_td'>
                                                <div>產量指數：</div>
                                            </div>
                                            <div class='css_td'>
                                                <div class='` + kgClass + `'>` + kgScore + `</div>
                                            </div>
                                            <div class='css_td'>
                                                <div>價位指數：</div>
                                            </div>
                                            <div class='css_td'>
                                                <div class='` + priceClass + `'>` + priceScore + `</div>
                                            </div>
                                        </div>
                                        <div class='css_tr'>
                                            <div class='css_td'>
                                                <div>綜合推薦指數：</div>
                                            </div>
                                            <div class='css_td'>
                                                <div class='` + totalClass + `'>` + totalScore + `</div>
                                            </div>
                                        </div>
                                    </div>`);
                                                        }
                                                    });
                                                });
                                            });

                                            // map map map
                                            var options = $lf.map_options = {
                                                itr_callback: function(res) {
                                                    return res;
                                                },
                                                fin_callback: function(results) {
                                                    var iivi = {};
                                                    results.forEach(function(res) {
                                                        var store_uri = res['?target'].value;
                                                        if (!iivi[store_uri]) iivi[store_uri] = {
                                                            properties: {}
                                                        };
                                                        var pred = res['?p'].value;
                                                        var lat = res['?lat'].value;
                                                        var long = res['?long'].value;
                                                        iivi[store_uri].latlng = lat + ' ' + long;
                                                        iivi[store_uri].lat = lat;
                                                        iivi[store_uri].lng = long;
                                                        if (!iivi[store_uri].properties[pred]) iivi[store_uri].properties[pred] = [];
                                                        if (iivi[store_uri].properties[pred].indexOf(res['?o'].value) == -1) {
                                                            iivi[store_uri].properties[pred].push(res['?o'].value);
                                                        }
                                                    });

                                                    if (!window.map_markers) window.map_markers = {};
                                                    if (!window.map_markers[$lf.mapid]) window.map_markers[$lf.mapid] = {};

                                                    console.log(iivi);
                                                    if (!!window.map_markers[$lf.mapid]) {
                                                        for (var mid in window.map_markers[$lf.mapid]) {
                                                            if (window.map_markers[$lf.mapid].hasOwnProperty(mid)) {
                                                                window.map[$lf.mapid].removeLayer(window.map_markers[$lf.mapid][mid]);
                                                                delete window.map_markers[$lf.mapid][mid];
                                                            }
                                                        }
                                                    }


                                                    var makePopupContents = window.makePopupContents = function(properties, selected = ['label', 'hasAddress', 'sell', 'dishName']) {
                                                        var ret = '<div class="css_table">';
                                                        var contents = [];
                                                        var pred_index = [];
                                                        for (var p in properties) {
                                                            var c = '';
                                                            if (properties.hasOwnProperty(p)) {
                                                                var predLocalName = p.split(/#|\//).pop();
                                                                if (predLocalName == 'sell') {
                                                                    var vs = [];
                                                                    properties[p].forEach(function(sell_v) {
                                                                        vs.push(sell_v.split('/').pop());
                                                                    })
                                                                    var v = vs.join('、');
                                                                } else {
                                                                    var v = properties[p].join('、');
                                                                }

                                                                c += '<div class="css_tr">';
                                                                var class_add = '';
                                                                if (predLocalName.match(/Detail$/)) {
                                                                    class_add = ' detail';
                                                                }
                                                                c += '<div class="css_td" style="width:20%;" predicate="' + p + '">' + predLocalName + '</div><div class="css_td triple object' + class_add + '" pred_local_name="' + predLocalName + '" style="width:75%; padding-left:2em;">' + v + '</div>';
                                                                c += '</div>';
                                                                if (!!selected) {
                                                                    if (selected.indexOf(predLocalName) > -1) {
                                                                        contents.push(c);
                                                                        pred_index.push(predLocalName);
                                                                    }
                                                                } else {
                                                                    contents.push(c);
                                                                }
                                                            }
                                                        }

                                                        if (!!selected) {
                                                            selected.forEach(function(s) {
                                                                if (pred_index.indexOf(s) > -1) {
                                                                    ret += contents[pred_index.indexOf(s)];
                                                                }
                                                            });
                                                        } else {
                                                            ret += contents.join('');
                                                        }

                                                        ret += '</div>';
                                                        return ret;
                                                    }

                                                    var blueIcon = L.icon({
                                                        iconUrl: "./images/marker-icon.png",
                                                        iconSize: [15, 25], // size of the icon
                                                        iconAnchor: [8, 25],
                                                        popupAnchor: [0, -18]
                                                    });

                                                    var whateverIcon = L.icon({
                                                        iconUrl: "./images/marker-icon-custom.png",
                                                        iconSize: [15, 25], // size of the icon
                                                        iconAnchor: [8, 25],
                                                        popupAnchor: [0, -18]
                                                    });

                                                    for (var i in iivi) {
                                                        if (iivi.hasOwnProperty(i)) {
                                                            var v = iivi[i];
                                                            if (!!v.properties[TAP('is_chain_store').value] && v.properties[TAP('is_chain_store').value].indexOf('yes') > -1) {
                                                                var marker = L.marker([v.lat, v.lng], {
                                                                    icon: blueIcon
                                                                });
                                                            } else {
                                                                var marker = L.marker([v.lat, v.lng], {
                                                                    icon: whateverIcon
                                                                });
                                                            }

                                                            marker.bindPopup(makePopupContents(v.properties));
                                                            if (!window.map_markers[$lf.mapid][v.latlng]) {
                                                                marker.addTo(window.map[$lf.mapid]);
                                                                window.map_markers[$lf.mapid][v.latlng] = marker;
                                                            }
                                                        }
                                                    }

                                                    return results;
                                                },
                                                args: {
                                                    center: $lf.getMapCenter($lf.mapid),
                                                    boundary: $lf.getMapBoundary($lf.mapid)
                                                }
                                            }

                                            switch ($lf.mapid) {
                                                case 'map_store':
                                                    $lf.queryStoresByIngredientFromLocal(crop_name, options);
                                                    break;
                                                case 'map_restaurant':
                                                    $lf.queryRestsByIngredientFromLocal(crop_name, options);
                                                    break;
                                                case 'map_prod_place':
                                                    $lf.queryProdPlacesByIngredientFromLocal(crop_name, options);
                                                    break;
                                                default:
                                                    $lf.queryStoresByIngredientFromLocal(crop_name, options);
                                                    break;
                                            }


                                        }); // end of onclick

                                    }, {}
                                );
                            }, {}); // end of mapping crop names
                        }
                    });
            }
        });
}

$f(document).ready(function() {
    $f(function() {
        $f(document).keypress(function(e) {
            if (e.key == 't' || e.key == 'T') {
                if ($f('#blind').length == 1) {
                    if (!$f('#blind').hasClass('loading')) {
                        $f('#blind').addClass('loading');
                    } else {
                        $f('#blind').removeClass('loading');
                    }
                }
            }
        });
        $lf.tabs = $f("#tabs").tabs({
            activate: function(e, ui) {

                switch (ui.newTab.attr('id')) {
                    case 'tab-map-store':
                        $lf.showMap('map_store');
                        var func = $lf.queryStoresByIngredientFromLocal;
                        break;
                    case 'tab-map-restaurant':
                        $lf.showMap('map_restaurant');
                        var func = $lf.queryRestsByIngredientFromLocal;
                        break;
                    case 'tab-map-prod-place':
                        $lf.showMap('map_prod_place');
                        var func = $lf.queryProdPlacesByIngredientFromLocal;
                        break;
                    case 'tab-tap-info':
                        break;
                }

                if (!!$lf.crop_name && typeof func == 'function') {
                    func($lf.crop_name, $lf.map_options);
                }

            },
            create: function(e, ui) {
                $lf.showMap('map_store');
            }
        });
    });

    // if (!window.map[mapid]) $lf.showMap();

    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function(sth) {
        console.log(sth[0].id);
        //alert('shit');
        var tab_id = sth[0].id;
        window.$lf.page_url = sth[0].url;
        if (urlRegex.test(sth[0].url)) {
            chrome.tabs.sendMessage(tab_id, {
                text: 'report_back'
            }, doStuffWithDom);
        }
    })
});

function intersect(a, b) {
    var t;
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function(e) {
        return b.indexOf(e) > -1;
    });
}