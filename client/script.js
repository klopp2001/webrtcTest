const peerConnection = new RTCPeerConnection()

let t

function postToServer(url, body) {
  try {
    const response = fetch(`${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(body),
    })
    //.then(() => console.log(response))
  } catch (e) {
    console.log(e, "error while creting offer")
  }
}

;(async function () {
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  })

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  peerConnection.ontrack = (e) => {
    console.log("adding new source")
    console.log(e)
    console.log(e.streams)
    audio.srcObject = e.streams[0]
  }

  const audio = document.getElementById("peer__audio")

  const server = "http://localhost:3000"

  const id = Math.floor(Math.random() * 10000).toString()
  const createConnection = async () => {
    let dataChannel = peerConnection.createDataChannel("test")
    dataChannel.onopen = () => console.log("Channel oppened")
    dataChannel.onmessage = (e) => console.log("Message ", e.data)
    dataChannel.onerror = () => console.log("Error occured")
    let flag = false
    const offer = await peerConnection.createOffer()
    peerConnection
      .setLocalDescription(offer)
      .catch(() => console.log("Error occured"))
    console.log("offer created", offer)

    peerConnection.onicecandidate = (e) => {
      console.log("icecandidate local", peerConnection.localDescription)
      const reqBody = {
        id: id,
        offer: JSON.stringify(peerConnection.localDescription),
        iceCandidate: e.candidate,
      }
      postToServer(`${server}/web-rtc/offer`, reqBody)
      console.log("create req body", reqBody)
    }
  }

  const recieveConnection = async (offer) => {
    console.log("recieve connection ", offer.body)
    const offerJSON = JSON.parse(offer.body)

    peerConnection.setRemoteDescription(offerJSON)

    console.log("remote description ", peerConnection.remoteDescription)
    const answer = await peerConnection.createAnswer()
    peerConnection.setLocalDescription(answer)
    console.log("answer created ", answer)
    peerConnection.onicecandidate = (e) => {
      console.log("icecandidate remote ", peerConnection.localDescription)
      peerConnection.ondatachannel = (event) => {
        console.log("recieve channel ", dataChannel)
        let dataChannel = event.channel
        dataChannel.onopen = () => console.log("Channel oppened")
      }

      try {
        const reqBody = {
          id: id,
          answer: JSON.stringify(answer),
          iceCandidate: e.candidate,
        }

        postToServer(`${server}/web-rtc/answer`, reqBody)
      } catch (e) {
        console.log("error", e)
      }
    }
  }

  const listenToServer = async function subscribe() {
    try {
      console.log("Trying to connect")
      const b = {
        id: id,
      }
      const response = await fetch(`${server}/web-rtc/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(b),
      })

      console.log(response.body)
      if (response.status === 504) {
        await subscribe()
      }

      const remoteMessage = await response.json()
      if (remoteMessage.type === "OFFER") {
        console.log("Offer")
        console.log(JSON.parse(remoteMessage.body))
        await recieveConnection(remoteMessage)
      } else if (remoteMessage.type === "ANSWER") {
        console.log("Answer")
        console.log(JSON.parse(remoteMessage.body))
        peerConnection
          .setRemoteDescription(JSON.parse(remoteMessage.body))
          .catch(() => console.log("Error occured"))
      }

      console.log(peerConnection)
    } catch (e) {
      console.log(e)
    }
  }

  listenToServer()
  document.getElementById("connect").onclick = createConnection

  const constraints = {
    audio: true,
    video: false,
  }
})()
