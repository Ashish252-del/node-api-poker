const {Emitter} = require("@socket.io/redis-emitter");
const {createClient} = require("redis");
const redisClient = createClient();
const {countOfnewNotifications, getMemberCount, getAnnouncementList, getJoinedclub, getClubByClubId} = require('../services/clubService')
let io;
const publisher = redisClient.duplicate();
const subscriber = redisClient.duplicate();

const getEmitter = () => {
    if (io) {
        return io;
    }
    return null;
}

const getRedisClient = async () => {
    if (redisClient.isReady) {
        return redisClient;
    }
    await redisClient.connect();
    return redisClient;
};

const getPublisher = () => {
    if (publisher) {
        return publisher;
    }
}

let initialiseRedis = async () => {
    io = new Emitter(await getRedisClient());
    await Promise.all([publisher.connect(), subscriber.connect()]);
    await subscriber.subscribe("ADMIN-COM", subscriberFunction);
    console.log("Redis connected");
}

async function subscriberFunction(message, channel) {
    console.log("MESSAGE : ", message, " CHANNEL : ", channel);
    if (typeof message == "string" && message.startsWith("{")) {
        message = JSON.parse(message);
    }
    if (typeof message !== "object") {
        console.log("NOT AN OBJECT", message);
    }
    switch (message.type) {
        case 'TESTADMIN':
            console.log("emitter is ", getEmitter)
            getEmitter().to(message.socketId).emit('TESTED');
            break;
        case 'GETNOTIFICATIONCOUNT':
            await sendLiveNotification(message.userId)
            break;
        case 'GETNEWMEMBERCOUNT':
            let cnt = await getMemberCount({where: {is_approve: '0', clubId: message.clubId}});
            getEmitter().to(message.socketId).emit('NEWMEMBERCOUNT', JSON.stringify({NEWMEMBERCOUNT: cnt},null));
            break;
        case 'GETANNOUNCEMENT':
            let announcement = await getAnnouncementList({where: {status: '1'}});
            getEmitter().to(message.socketId).emit('GETANNOUNCEMENTRES', JSON.stringify({GETANNOUNCEMENT: announcement},null));
            break;
        case 'GETCLUBLIST':
            console.log('message', message);
            await emitClubList(message.userId)
            break;
    }
}


const sendLiveNotification = async (userId) => {
    let cnt = await countOfnewNotifications({where: {is_read: false, receiver_user_id: userId}});
    getEmitter().to("CLUBSERVICE" + userId).emit("NEWNOTIFICATION",JSON.stringify( {NOTIFICATIONCOUNT: cnt}, null))
}
const emitClumMembersInClub = async (clubId) => {
    let cnt = await getMemberCount({where: {is_approve: '0', clubId:clubId}});
    getEmitter().to("CLUB" + clubId).emit('NEWMEMBERCOUNT', JSON.stringify({NEWMEMBERCOUNT: cnt},null));
}

const sendLiveClumMembersCount = async (userId, clubId) => {
    let cnt = await getMemberCount({where: {is_approve: '0', clubId:clubId}});
    getEmitter().to("CLUBSERVICE" + userId).emit('NEWMEMBERCOUNT', JSON.stringify({NEWMEMBERCOUNT: cnt},null));
}
const emitClubList = async (userId) => {
    let cnt = await getJoinedclub({where:{user_id: userId, is_approve:'1'}, raw:true})
    let clubArr = [];
    for(let i=0;i<cnt.length;i++){
        let clubDet = await getClubByClubId({where:{clubId:cnt[i].clubId}});
        let datas = {
            club_id: cnt[i].clubId,
            club_name: clubDet.club_name,
            club_unique_id: clubDet.club_unique_id,
            rating: 0,
            image: '',
            club_adminId:clubDet.club_adminId
        }
        clubArr.push(datas);
    }
    getEmitter().to("CLUBSERVICE" + userId).emit("CLUBLIST", JSON.stringify({CLUBLIST: clubArr},null))
}

module.exports = {
    initialiseRedis,
    getRedisClient,
    getPublisher,
    sendLiveNotification,
    emitClubList,
    emitClumMembersInClub,
    sendLiveClumMembersCount,
    sendLiveClumMembersCount
}

