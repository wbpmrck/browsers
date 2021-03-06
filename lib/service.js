'use strict';

var fs = require('fs')
var http = require('http')
var path = require('path')

var express = require('express')
var useragent = require('useragent')
var logger = require('totoro-common').logger


exports.create = function(launcher, opts, cb) {
    var browsersMapping = opts.browsersMapping = {}

    var app = express()
    var server = http.createServer(app)
    var staticPath = path.join(__dirname, '../static')

    app.use(express.static(staticPath))
    app.use(express.bodyParser())
    app.set('views', staticPath)
    app.set('view engine', 'jade')

    app.get('/', function(req, res) {
        // 1. 显示当前系统有效的浏览器
        // 2. 显示当前已经启动的浏览器
        // 3. 页面中增加减少和添加浏览器操作
        res.render('index.html')
    })

    app.get('/browsers', function(req, res) {
        var browsers = opts.browsers
        var launchedBrowsers = {}

        browsers.forEach(function(b) {
            if (launchedBrowsers[b]) {
                launchedBrowsers[b]++
            } else {
                launchedBrowsers[b] = 1
            }
        })

        res.send({
            browsers: browsers,
            launchedBrowsers: launchedBrowsers
        })
    })

    app.get('/versions', function(req, res) {
        res.send(browsersMapping)
    })

    app.post('/browsers', function(req, res) {
        res.send({succ: launcher.launch(req.body.bName).length})
    })

    app.delete('/browsers', function(req, res) {
        var bName = req.body.bName

        launcher.kill(bName, function(err) {
            if (err) {
                res.send({succ: 0, err: err})
            } else {
                res.send({succ: 1})
            }
        })
    })

    app.get('/restart', function(req, res) {
        launcher.restart(function(err) {
            if (err) {
                res.send({succ: 0, msg: 'restart error', err: err})
            } else {
                res.send({succ: 1})
            }
        })
    })

    app.get('/version', function(req, res) {
        var agent = req.headers['user-agent']
        var bInfo = useragent.parse(agent)
        browsersMapping[bInfo.family.toLowerCase()] = {
            value: bInfo.toString(),
            agent: agent
        }
        res.send(JSON.stringify(bInfo))
    })

    app.get('/capture', function(req, res) {
        var browsers = Object.keys(opts.browsers)
        // req.body 包含了浏览器的启动参数. 客户端只是被动的启动
        launcher.launch(browsers, req.body)
    })

    if (opts.manager) {
        var clients = opts.clients || []
        // 加载所有 node 的管理页面
        app.get('/hub/managers', function(req, res) {
            res.send(clients)
        })

        var managerHtml
        app.get('/hub/console', function(req, res) {
            if (!managerHtml) {
                managerHtml = fs.readFileSync(path.join(staticPath, 'manager.html')).toString()
            }
            res.send(managerHtml)
        })

        if (clients.length === 0) {
            return
        }

        setInterval(function() {
            clients.forEach(function(client) {
                http.request(client, function(res) {
                    if (res.statusCode > 299) {
                        logger.info('lost client ' + client)
                        clients.splice(clients.indexOf(client), 1)
                    }
                }).on('error', function(e) {
                    logger.info('lost client ' + client)
                    clients.splice(clients.indexOf(client), 1)
                })
            })
        }, 10 * 60 * 1000)
    }

    server.listen(opts.port, function() {
        cb()
    })

    var io = opts.io = require('socket.io').listen(server)

    io.configure('development', function(){
        io.set('log level', 2)
    })
}
