import express from 'express';
import http from 'http'
import { Server } from 'socket.io';
import cors from 'cors'


const app = express()
app.use(cors({origin:"*"}))
const Port = 3000;

const server = http.createServer(app) //web sockets need access to the underlying http server
const io = new Server(server) //web socket server initialized


const users = {}

io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id)
    
    //User registers with username
    socket.on("register", (username) => {
        users[username] = socket.id
        socket.username = username
        console.log(`${username} registered with socket ${socket.id}`)
        console.log("Online users: ", Object.keys(users))

        socket.emit("registered", {
            message: `Welcome ${username}, you are now registered`,
            onlineUsers: Object.keys(users)   //send back who's online
        })
        
        //Notify others that a new user came online
        socket.broadcast.emit("user_online", {username, onlineUsers: Object.keys(users)})
    })

    socket.on("private_message", ({to,message}) => {
        const recepientId = users[to]

        if (!recepientId) {
            socket.emit("error_message",{error: `User ${to} is not online`})
            return
        }

        const payload = {
            from:socket.username,
            to,
            message,
            timeStamp: new Date().toISOString()
        }

        io.to(recepientId).emit("private_message", payload)

        socket.emit("message_sent", payload)
    })

    socket.on("get_online_users", () => {
        socket.emit("online_users",{onlineUsers: Object.keys(users)})
    })

    socket.on("send_message", (data) => {    //this listens for the send message event from the client 
        console.log("Message received", data)
        io.emit("receive_message", data)
    })

    socket.on("disconnect", () => {
        console.log("User disconnected: ", socket.id)

        if (socket.username) {
            delete users[socket.username]
            console.log(`${socket.username} has gone offline`)
            console.log("Online users: ", Object.keys(users))
        }
    })
})


app.get("/", (req,res)=> {
    res.send("Hello World!")
})

server.listen(Port, () => {
    console.log(`Server running on Port:${Port}`)
})