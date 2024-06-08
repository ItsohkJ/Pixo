
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const os = require('os');

require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true })); 

app.post("/", async (req, res) => {
  try {
    const search = req.body.search;
    var page = req.body.page;
    const response = await axios.get(`https://api.unsplash.com/search/photos?page=1&query=${search}&client_id=B41W8nbSLr2YcuM5E4XBxu3sG8h2qDzYglQs0xfMj4A`);
    const result = response.data.results;
    
    if (result.length === 0) {
      
      const randomResponse = await axios.get(`https://api.unsplash.com/photos/random?count=10&client_id=B41W8nbSLr2YcuM5E4XBxu3sG8h2qDzYglQs0xfMj4A`);
      const randomPhotos = randomResponse.data;
      res.render("photos", { photos: randomPhotos, search, page });
    } else {
      res.render("photos", { photos: result, search, page });
    }
  } catch (error) {
    console.error("Failed to make request:", error.message);
    
    const randomResponse = await axios.get(`https://api.unsplash.com/photos/random?count=10&client_id=B41W8nbSLr2YcuM5E4XBxu3sG8h2qDzYglQs0xfMj4A`);
    const randomPhotos = randomResponse.data;
    res.render("photos", { photos: randomPhotos, search: '', page: 1 });
  }
});


app.post("/next", async (req, res) => {
  try {
    const search = req.body.search;
    var page = req.body.page;
     page++;
    const response = await axios.get(`https://api.unsplash.com/search/photos?page=${page}&query=${search}&client_id=B41W8nbSLr2YcuM5E4XBxu3sG8h2qDzYglQs0xfMj4A`);
    const result = response.data.results;
    res.render("photos", { photos: result, search, page }); 
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("photos", { photos: [], error: "Failed to fetch photos" });
  }
});

app.get('/photo/:id', async (req, res) => {
  const photoId = req.params.id;
  const downloadLocation = req.query.download_location;

  try {
    const response = await axios.get(`https://api.unsplash.com/photos/${photoId}?client_id=B41W8nbSLr2YcuM5E4XBxu3sG8h2qDzYglQs0xfMj4A`);
    const photo = response.data;
    res.render('photoDetails', { photo, downloadLocation, accessKey: UNSPLASH_ACCESS_KEY});
  } catch (error) {
    console.error("Failed to fetch photo details:", error.message);
    res.status(500).send("Failed to fetch photo details");
  }
});

app.post('/download', async (req, res) => {
  const { downloadUrl, filename } = req.body;

  console.log(`Download URL: ${downloadUrl}`);
  console.log(`Filename: ${filename}`);

  try {
   const homeDir = os.homedir();
    const downloadsDir = path.join(homeDir, 'Downloads');
    
    // Ensure the downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    const filePath = path.join(downloadsDir, filename);
    console.log(`File path: ${filePath}`);

    fs.writeFileSync(filePath, response.data);

    console.log(`Image written to file: ${filePath}`);
    
    // Send the file as a response
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Failed to download image:", err.message);
        res.status(500).send("Failed to download image");
      } else {
        console.log("Image downloaded successfully:", filename);
      }
    });
  } catch (error) {
    console.error("Failed to fetch and download image:", error.message);
    res.status(500).send("Failed to fetch and download image");
  }
});

app.get('/', (req, res) => {
  res.render("index", { photos: [] });
});

app.get('/about', (req, res) => {
  res.render("about");
});

app.get('/contact', (req, res) => {
  res.render("contact", { success: '' }); // Only initialize success variable
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_TO, 
    subject: `New message from Pixo`,
    text: `You have received a new message from ${name} (${email}):\n\n${message}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.render('contact', { error: 'There was an error sending your message. Please try again later.' });
    } else {
      console.log('Email sent:', info.response);
      res.render('contact', { success: 'Your message has been sent successfully!' });
    }
  });
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

