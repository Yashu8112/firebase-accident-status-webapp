const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('public'));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database connection:', err);
    } else {
        console.log('Database connection opened successfully');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
        // Render an error page
        return res.status(400).render('error', { message: 'Username and password are required' });
    }

    // Check if username exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            console.error('Error checking username:', err);
            // Render an error page
            return res.status(500).render('error', { message: 'Internal Server Error' });
        }
        if (row) {
            // Render an error page
            return res.status(400).render('error', { message: 'Username already exists' });
        }

        // Insert new user into database
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) {
                console.error('Error inserting user:', err);
                // Render an error page
                return res.status(500).render('error', { message: 'Internal Server Error' });
            }
            // Render a success page
            res.render('success', { message: 'Registration successful' });
        });
    });
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
            // Render an error page with the message 'Internal Server Error'
            return res.status(500).render('error', { message: 'Internal Server Error' });
        }
        if (!row) {
            // Render an error page with the message 'Invalid username or password'
            return res.status(400).render('error', { message: 'Invalid username or password' });
        }

        req.session.user = { id: row.id, username: row.username };
        res.redirect('/dashboard');
    });
});
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    // Retrieve the username from the session data
    const username = req.session.user.username;
    // Pass the username to the dashboard template
    res.render('dashboard', { username: username });
});



app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
