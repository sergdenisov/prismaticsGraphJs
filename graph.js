/* Основной блок
===============================================================================
*/
// Простой геттер
function get(x) {
    'use strict';
    return x;
}

// Суммирование (просто элементов массива или с использование доп. функции)
function sum(arr, func) {
    'use strict';
    func = func || get;
    var i,
        result = 0;

    for (i = 0; i < arr.length; i += 1) {
        result += func(arr[i]);
    }
    return result;
}

// Квадратный корень
function sqr(x) {
    'use strict';
    return Math.pow(x, 2);
}

// Получение массива с параметрами функции
function getFuncParamArray(func) {
    'use strict';
    var fnStr = func.toString(),
        result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/[a-z$_0-9]+/ig);

    if (result === null) {
        result = [];
    }

    return result;
}

// Проверка, является ли переменная функцией
function isFunction(functionToCheck) {
    'use strict';
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

// Получение ребер графа и проверка на цикличность
function getVerticesEdges(graph, resultGraph, key) {
    'use strict';
    var ERROR_MSG = 'Cannot compile cyclic graph ',
        i,
        verticesEdges = getFuncParamArray(graph[key]),
        curEdge,
        curVerticesEdges;

    for (i = 0; i < verticesEdges.length; i += 1) {
        curEdge = verticesEdges[i];
        if (resultGraph[curEdge]) {
            curVerticesEdges = resultGraph[curEdge].edges;
        }

        if (curVerticesEdges && curVerticesEdges.indexOf(key) !== -1) {
            throw ERROR_MSG + curEdge + ' --> ' + key + ' --> ' + curEdge;
        }
    }

    return verticesEdges;
}

// Получение вершин графа
function getGraphVertices(graph) {
    'use strict';
    var key,
        curVertex,
        resultGraph = {},
        resultVertex;

    for (key in graph) {
        if (graph.hasOwnProperty(key)) {
            curVertex = graph[key];
            resultVertex = {};

            if (isFunction(curVertex)) {
                resultVertex.func = curVertex;
                resultVertex.edges = getVerticesEdges(graph, resultGraph, key);
            } else {
                resultVertex.value = curVertex;
            }

            resultGraph[key] = resultVertex;
        }
    }

    return resultGraph;
}

// Установка входных данных для графа
function setGraphInputData(procGraph, inputObject) {
    'use strict';
    var ERROR_MSG = 'Missing argument ',
        key,
        curVertex,
        inputVertex;

    for (key in procGraph) {
        if (procGraph.hasOwnProperty(key)) {
            curVertex = procGraph[key];

            if (!curVertex.func) {
                inputVertex = inputObject[key];
                if (inputVertex) {
                    curVertex.value = inputVertex;
                } else {
                    throw ERROR_MSG + key;
                }
            }
        }
    }
}

// Установка входных данных для "ленивого" графа
function setLazyGraphInputData(procGraph, inputObject, verticesToReturn) {
    'use strict';
    var i,
        curVertex,
        key;

    setGraphInputData(procGraph, inputObject);

    if (verticesToReturn) {
        for (i = 0; i < verticesToReturn.length; i += 1) {
            curVertex = procGraph[verticesToReturn[i]];
            if (curVertex) {
                curVertex.isNeedToReturn = true;
            }
        }
    } else {
        for (key in procGraph) {
            if (procGraph.hasOwnProperty(key)) {
                curVertex = procGraph[key];
                if (curVertex.func) {
                    curVertex.isNeedToReturn = true;
                }
            }
        }
    }
}

// Вычисление значения вершины графа
function calcGraphVertex(vertex, procGraph) {
    'use strict';
    var i,
        argNames = vertex.edges,
        args = [],
        curVertex;

    for (i = 0; i < argNames.length; i += 1) {
        curVertex = procGraph[argNames[i]];

        if (curVertex.value) {
            args.push(curVertex.value);
        } else {
            curVertex.value = calcGraphVertex(curVertex, procGraph);
            args.push(curVertex.value);
        }
    }

    return vertex.func.apply(null, args);
}

// Вычисления значений вершин обычного графа
function calcEagerGraph(procGraph, verticesToReturn) {
    'use strict';
    var key,
        curVertex,
        resultGraph = {},
        i,
        resultKeys;

    for (key in procGraph) {
        if (procGraph.hasOwnProperty(key)) {
            curVertex = procGraph[key];

            if (curVertex.func && !curVertex.value) {
                curVertex.value = calcGraphVertex(curVertex, procGraph);
            }

            if (!verticesToReturn && curVertex.func) {
                resultGraph[key] = curVertex.value;
            }
        }
    }

    if (verticesToReturn) {
        for (i = 0; i < verticesToReturn.length; i += 1) {
            key = verticesToReturn[i];
            curVertex = procGraph[key];
            if (curVertex) {
                resultGraph[key] = curVertex.value;
            }
        }
    }

    resultKeys = Object.keys(resultGraph);
    return resultKeys.length === 1 ? resultGraph[resultKeys[0]] : resultGraph;
}

// Вычисления значений вершин "ленивого" графа
function calcLazyGraph(procGraph) {
    'use strict';
    var key,
        curVertex,
        resultGraph = {},
        resultKeys,
        notCalcVertices = [],
        i,
        log = 'WIN: ';

    for (key in procGraph) {
        if (procGraph.hasOwnProperty(key)) {
            curVertex = procGraph[key];

            if (curVertex.func && curVertex.isNeedToReturn) {
                if (!curVertex.value) {
                    curVertex.value = calcGraphVertex(curVertex, procGraph);
                }
                resultGraph[key] = curVertex.value;
            }
        }
    }

    for (key in procGraph) {
        if (procGraph.hasOwnProperty(key)) {
            curVertex = procGraph[key];

            if (curVertex.func && !curVertex.value) {
                notCalcVertices.push(key);
            }
        }
    }

    if (notCalcVertices.length > 0) {
        for (i = 0; i < notCalcVertices.length; i += 1) {
            log += (i === 0 ? notCalcVertices[i] : ' and ' + notCalcVertices[i]);
        }
        log += (notCalcVertices.length > 1 ? ' are' : ' is') + ' not computed.';
        /*jslint devel: true */
        console.log(log);
    }

    resultKeys = Object.keys(resultGraph);
    return resultKeys.length === 1 ? resultGraph[resultKeys[0]] : resultGraph;
}

// Компиляция графа ("ленивого" и обычного)
function graphCompile(statsGraph, isLazy) {
    'use strict';
    var procGraph;

    try {
        procGraph = getGraphVertices(statsGraph);

        return function (inputObject, verticesToReturn) {
            var result;
            try {
                if (isLazy) {
                    setLazyGraphInputData(procGraph, inputObject, verticesToReturn);
                } else {
                    setGraphInputData(procGraph, inputObject);
                }

                result = isLazy ? calcLazyGraph(procGraph) : calcEagerGraph(procGraph, verticesToReturn);
                return result;
            } catch (err) {
                console.error(err);
            }
        };

    } catch (err) {
        console.error(err);
    }
}
/* Конец Основного блока
===============================================================================
*/


/* Тестирование
===============================================================================
*/
// Тестовый граф
var statsGraph = {
    xs: [],
    n: function (xs) { 'use strict'; return xs.length; },
    m: function (xs, n) { 'use strict'; return sum(xs) / n; },
    m2: function (xs, n) { 'use strict'; return sum(xs, sqr) / n; },
    v:  function (m, m2) { 'use strict'; return m2 - sqr(m); }
};

var result;

console.log('Начало тестирования.');

console.log('\nКомпиляция и вычисление обычного графа.');
var stats = graphCompile(statsGraph, false);
result = stats({xs: [1, 2, 3, 6]});
console.log(result);

console.log('\nПроверка на ошибки при вычислении графа.');
result = stats({ys: [1, 2, 3, 6]});
console.log(result);

console.log('\nПроверка на ошибки при компиляции графа.');
graphCompile({ x: function (y) { 'use strict'; return y; }, y: function (x) { 'use strict'; return x; } }, false);

console.log('\nКомпиляция "ленивого" графа и вычисление его вершины m.');
var lazyStats = graphCompile(statsGraph, true);
result = lazyStats({xs: [1, 2, 3, 6]}, ['m']);
console.log(result);

console.log('\nКонец тестирования.');
/* Конец тестирования
===============================================================================
*/