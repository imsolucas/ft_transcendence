export function LandingPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen flex justify-center items-center font-poppins';
  container.style.background = 'linear-gradient(90deg, #e2e2e2, #c9d6ff)';
  
  container.innerHTML = `
    <div class="container relative w-[850px] h-[550px] bg-white m-5 rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden max-w-[90vw] font-poppins">
      <!-- Login Form -->
      <div class="form-box login absolute right-0 w-1/2 h-full bg-white flex items-center text-gray-800 text-center p-10 z-10 transition-all duration-[600ms] ease-in-out delay-[1200ms]">
        <form class="w-full">
          <h1 class="text-4xl -mt-2 mb-4 font-poppins font-semibold text-gray-800">Login</h1>
          <div class="input-box relative my-8">
            <input type="text" placeholder="Username" required class="w-full py-3 px-5 pr-12 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder-gray-500" />
            <i class="bx bxs-user absolute right-5 top-1/2 -translate-y-1/2 text-xl text-gray-600"></i>
          </div>
          <div class="input-box relative my-8">
            <input type="password" placeholder="Password" required class="w-full py-3 px-5 pr-12 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder-gray-500" />
            <i class="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl text-gray-600"></i>
          </div>
          <div class="forgot-link -mt-4 mb-4">
            <a href="#" class="text-sm text-gray-800 hover:text-[#7494ec] transition-colors font-poppins">Forgot Password?</a>
          </div>
          <button type="submit" class="btn login-submit-btn w-full h-12 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:opacity-90 transition-all font-poppins" style="background: #7494ec;">Login</button>
          <p class="text-sm my-4 text-gray-600 font-poppins">or login with social platforms</p>
          <div class="social-icons flex justify-center gap-2">
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-google"></i>
            </a>
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-facebook"></i>
            </a>
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-github"></i>
            </a>
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-linkedin"></i>
            </a>
          </div>
        </form>
      </div>

      <!-- Registration Form -->
      <div class="form-box register absolute right-0 w-1/2 h-full bg-white flex items-center text-gray-800 text-center p-10 z-10 transition-all duration-[600ms] ease-in-out delay-[1200ms] invisible">
        <form class="w-full">
          <h1 class="text-4xl -mt-2 mb-4 font-poppins font-semibold text-gray-800">Registration</h1>
          <div class="input-box relative my-8">
            <input type="text" placeholder="Username" required class="w-full py-3 px-5 pr-12 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder-gray-500" />
            <i class="bx bxs-user absolute right-5 top-1/2 -translate-y-1/2 text-xl text-gray-600"></i>
          </div>
          <div class="input-box relative my-8">
            <input type="email" placeholder="Email" required class="w-full py-3 px-5 pr-12 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder-gray-500" />
            <i class="bx bxs-envelope absolute right-5 top-1/2 -translate-y-1/2 text-xl text-gray-600"></i>
          </div>
          <div class="input-box relative my-8">
            <input type="password" placeholder="Password" required class="w-full py-3 px-5 pr-12 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder-gray-500" />
            <i class="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl text-gray-600"></i>
          </div>
          <button type="submit" class="btn register-submit-btn w-full h-12 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:opacity-90 transition-all font-poppins" style="background: #7494ec;">Register</button>
          <p class="text-sm my-4 text-gray-600 font-poppins">or register with social platforms</p>
          <div class="social-icons flex justify-center gap-2">
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-google"></i>
            </a>
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-facebook"></i>
            </a>
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-github"></i>
            </a>
            <a href="#" class="inline-flex p-2 border-2 border-gray-300 rounded-lg text-2xl text-gray-800 hover:border-[#7494ec] hover:text-[#7494ec] transition-colors">
              <i class="bx bxl-linkedin"></i>
            </a>
          </div>
        </form>
      </div>

      <!-- Toggle Box with animated background -->
      <div class="toggle-box absolute w-full h-full">
        <div class="toggle-bg absolute -left-[250%] w-[300%] h-full rounded-[150px] z-20 transition-all duration-[1800ms] ease-in-out" style="background: #7494ec;"></div>
      </div>

      <!-- Toggle Panels -->
      <div class="toggle-panel toggle-left absolute left-0 w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[600ms] ease-in-out delay-[1200ms]">
        <h1 class="text-4xl -mt-2 mb-4 font-poppins font-semibold">Welcome Back To</h1>
		<h1 class="text-4xl -mt-2 mb-4 font-poppins font-semibold">Super Pong!</h1>
        <p class="text-sm mb-5 text-gray-100 font-poppins">Don't have an account?</p>
        <button class="btn register-btn w-40 h-11 bg-transparent border-2 border-white rounded-lg cursor-pointer text-base text-white font-semibold shadow-none hover:bg-white hover:text-[#7494ec] transition-colors font-poppins">Register</button>
      </div>

      <div class="toggle-panel toggle-right absolute -right-1/2 w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[600ms] ease-in-out delay-[600ms]">
        <h1 class="text-4xl -mt-2 mb-4 font-poppins font-semibold">Hello, Welcome To</h1>
		<h1 class="text-4xl -mt-2 mb-4 font-poppins font-semibold">Super Pong!</h1>
        <p class="text-sm mb-5 text-gray-100 font-poppins">Already have an account?</p>
        <button class="btn login-btn w-40 h-11 bg-transparent border-2 border-white rounded-lg cursor-pointer text-base text-white font-semibold shadow-none hover:bg-white hover:text-[#7494ec] transition-colors font-poppins">Login</button>
      </div>
    </div>

    <!-- Mobile responsive styles -->
    <style>
      @media screen and (max-width: 650px) {
        .container {
          height: calc(100vh - 40px);
        }

        .form-box {
          bottom: 0;
          width: 100%;
          height: 70%;
          right: 0 !important;
        }

        .container.active .form-box {
          right: 0 !important;
          bottom: 30%;
        }

        .toggle-bg {
          left: 0 !important;
          top: -270%;
          width: 100%;
          height: 300%;
          border-radius: 20vw;
        }

        .container.active .toggle-bg {
          left: 0 !important;
          top: 70%;
        }

        .toggle-panel {
          width: 100%;
          height: 30%;
        }

        .toggle-panel.toggle-left {
          top: 0;
          left: 0 !important;
        }

        .container.active .toggle-panel.toggle-left {
          left: 0 !important;
          top: -30%;
        }

        .toggle-panel.toggle-right {
          right: 0 !important;
          bottom: -30%;
        }

        .container.active .toggle-panel.toggle-right {
          bottom: 0;
        }
      }

      @media screen and (max-width: 400px) {
        .form-box {
          padding: 20px;
        }

        .toggle-panel h1 {
          font-size: 30px;
        }
      }

      /* Active states */
      .container.active .form-box.login {
        right: 50%;
      }

      .container.active .form-box.register {
        visibility: visible;
        right: 50%;
      }

      .container.active .toggle-bg {
        left: 50%;
      }

      .container.active .toggle-panel.toggle-left {
        left: -50%;
        transition-delay: 600ms;
      }

      .container.active .toggle-panel.toggle-right {
        right: 0;
        transition-delay: 600ms;
      }
    </style>
  `;

  return container;
}