## API

ใช้ pain text ในการส่งข้อมูล

Post : update_row

https://script.google.com/macros/s/AKfycbwpjzNXx4PIgoYwVdbqz7hAf8QWyBmwzw__mybTIvtNIz9y4dU2bVWcjrV1UZ1tnOW0/exec

payload

{
  "action": "update_row",
  "payload": {
    "id": "u_123",
    "name": "Natnatee",
    "reward": "คูปอง 50 บาท"
  }
}

response

{
    "status": 409,
    "ok": false,
    "error": "reward_limit_exceeded",
    "message": "user id u_123 has already used 3 rewards",
    "rewards": [
        "คูปอง 20 บาท",
        "คูปอง 30 บาท",
        "คูปอง 40 บาท"
    ]
}

Get: get_user_by_id

https://script.google.com/macros/s/AKfycbwpjzNXx4PIgoYwVdbqz7hAf8QWyBmwzw__mybTIvtNIz9y4dU2bVWcjrV1UZ1tnOW0/exec?action=get_user_by_id&id=u_123

response

{
    "status": 200,
    "ok": true,
    "user": {
        "id": "u_123",
        "name": "Natnatee",
        "reward_1": "คูปอง 20 บาท",
        "reward_2": "คูปอง 30 บาท",
        "reward_3": "คูปอง 40 บาท"
    }
}

Get : get_random_reward_and_video

https://script.google.com/macros/s/AKfycbwpjzNXx4PIgoYwVdbqz7hAf8QWyBmwzw__mybTIvtNIz9y4dU2bVWcjrV1UZ1tnOW0/exec?action=random_reward_and_video

response

{
    "status": 200,
    "ok": true,
    "results": [
        {
            "reward": {
                "tier": "win",
                "value": "กาแฟสตาบัค1กล่อง"
            },
            "video": "https://screens.omg.group/play/libraryitem/13AD856566B181"
        },
        {
            "reward": {
                "tier": "fail2",
                "value": "ขนม 5 บาท"
            },
            "video": "https://screens.omg.group/play/libraryitem/13AD856566B181"
        },
        {
            "reward": {
                "tier": "fail2",
                "value": "ขนม 5 บาท"
            },
            "video": "https://screens.omg.group/play/libraryitem/13AD856566B181"
        }
    ]
}

