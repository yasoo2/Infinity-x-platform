
// Using native fetch (Node.js 18+)

async function callPaymentsAPI() {
    const response = await fetch('https://api.example.com/pay', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer <token>'
        },
        body: "{\"amount\":100}"
    });
    return response.json();
}

callPaymentsAPI().then(data => console.log(data));
