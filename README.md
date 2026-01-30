# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs both the backend server and the frontend app concurrently.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
The backend runs on [http://localhost:5000](http://localhost:5000).

### `npm start`

Runs only the frontend app in the development mode.
Note: You need to run the backend separately if you use this command.

### `npm run server`

Runs only the backend server.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

#### Option 1: Render (Recommended - Easiest)
Deploy both Frontend and Backend together as a single service.
1. Push this code to GitHub.
2. Go to [Render.com](https://render.com) and create a new **Web Service**.
3. Connect your repository.
4. Render will detect `render.yaml` automatically.
5. Click **Create Web Service**.
   - It will run `npm install && npm run build`.
   - Then it will start `node server.js`.
6. Your app will be live at `https://your-app-name.onrender.com`.

#### Option 2: Split Deployment (Vercel + Render)
Use this if you prefer hosting the Frontend on Vercel.
1. **Backend (Render)**:
   - Deploy as a Web Service.
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Copy the deployed URL.
2. **Frontend (Vercel)**:
   - Import the project in Vercel.
   - Add Environment Variable: `REACT_APP_BACKEND_URL` = Your Render Backend URL.
   - Deploy.

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
