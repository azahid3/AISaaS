// Khaana AI Landing Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add animation to elements when they come into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .testimonial-card, .step');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // CTA Button functionality
    const ctaButtons = document.querySelectorAll('.cta-button, .signup-button');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Scroll to signup section
            const signupSection = document.querySelector('.signup-cta');
            if (signupSection) {
                signupSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                // Focus on email input
                setTimeout(() => {
                    const emailInput = document.querySelector('.signup-form input');
                    if (emailInput) {
                        emailInput.focus();
                    }
                }, 500);
            }
        });
    });

    // Email validation and form submission
    const signupForm = document.querySelector('.signup-form');
    const emailInput = document.querySelector('.signup-form input[type="email"]');
    const signupButton = document.querySelector('.signup-button');

    if (signupForm && emailInput && signupButton) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            
            if (validateEmail(email)) {
                // Simulate form submission
                signupButton.textContent = 'Joining...';
                signupButton.disabled = true;
                
                setTimeout(() => {
                    signupButton.textContent = 'Welcome to Khaana AI! 🎉';
                    signupButton.style.background = '#4CAF50';
                    emailInput.value = '';
                    
                    // Show success message
                    showNotification('Successfully joined the waitlist! We\'ll be in touch soon.', 'success');
                    
                    // Reset button after 3 seconds
                    setTimeout(() => {
                        signupButton.textContent = 'Get Early Access';
                        signupButton.disabled = false;
                        signupButton.style.background = '';
                    }, 3000);
                }, 1500);
            } else {
                showNotification('Please enter a valid email address.', 'error');
                emailInput.focus();
            }
        });

        // Real-time email validation
        emailInput.addEventListener('input', function() {
            const email = this.value.trim();
            if (email && !validateEmail(email)) {
                this.style.borderColor = '#C03527';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    // Chat interface simulation
    const chatInput = document.querySelector('.chat-input input');
    const chatSendButton = document.querySelector('.chat-input button');
    const chatMessages = document.querySelector('.chat-interface .chat-messages');

    if (chatInput && chatSendButton && chatMessages) {
        chatSendButton.addEventListener('click', function() {
            const message = chatInput.value.trim();
            if (message) {
                addChatMessage(message, 'user');
                chatInput.value = '';
                
                // Simulate AI response
                setTimeout(() => {
                    const responses = [
                        "Great question! Let me help you with that recipe. 🌶️",
                        "I'd love to help you cook something amazing! What ingredients do you have?",
                        "Perfect! Here's a delicious recipe that's perfect for you...",
                        "That sounds delicious! Let me give you the perfect recipe for that."
                    ];
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    addChatMessage(randomResponse, 'ai');
                }, 1000);
            }
        });

        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                chatSendButton.click();
            }
        });
    }

    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Add hover effects to food items
    const foodItems = document.querySelectorAll('.food-item');
    foodItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.05)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Floating Food Slider functionality
    initFoodSlider();
});

// Food Slider Functions
function initFoodSlider() {
    const slider = document.querySelector('.floating-slider');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const dots = document.querySelectorAll('.dot');
    const foodCards = document.querySelectorAll('.food-card');
    
    if (!slider || !prevBtn || !nextBtn) return;
    
    let currentSlide = 0;
    const cardsPerView = getCardsPerView();
    const totalSlides = Math.ceil(foodCards.length / cardsPerView);
    
    // Update dots based on total slides
    updateDots(totalSlides);
    
    // Navigation functions
    function goToSlide(slideIndex) {
        currentSlide = slideIndex;
        const translateX = -currentSlide * (320 + 30); // card width + gap
        slider.style.transform = `translateX(${translateX}px)`;
        updateActiveDot();
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        goToSlide(currentSlide);
    }
    
    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        goToSlide(currentSlide);
    }
    
    function updateActiveDot() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }
    
    function updateDots(totalSlides) {
        const dotsContainer = document.querySelector('.slider-dots');
        if (!dotsContainer) return;
        
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('span');
            dot.className = `dot ${i === 0 ? 'active' : ''}`;
            dot.setAttribute('data-slide', i);
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }
    
    function getCardsPerView() {
        const width = window.innerWidth;
        if (width < 480) return 1;
        if (width < 768) return 2;
        if (width < 1024) return 3;
        return 4;
    }
    
    // Event listeners
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);
    
    // Touch/swipe support
    let startX = 0;
    let endX = 0;
    
    slider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });
    
    slider.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }
    
    // Mouse drag support
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    
    slider.addEventListener('mousedown', (e) => {
        isDragging = true;
        startPos = e.clientX;
        slider.style.cursor = 'grabbing';
    });
    
    slider.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const currentPos = e.clientX;
        currentTranslate = prevTranslate + currentPos - startPos;
    });
    
    slider.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        slider.style.cursor = 'grab';
        
        const movedBy = currentTranslate - prevTranslate;
        if (Math.abs(movedBy) > 100) {
            if (movedBy > 0) {
                prevSlide();
            } else {
                nextSlide();
            }
        }
        
        prevTranslate = currentTranslate;
    });
    
    slider.addEventListener('mouseleave', () => {
        isDragging = false;
        slider.style.cursor = 'grab';
    });
    
    // Auto-scroll functionality
    let autoScrollInterval;
    
    function startAutoScroll() {
        autoScrollInterval = setInterval(() => {
            nextSlide();
        }, 4000);
    }
    
    function stopAutoScroll() {
        clearInterval(autoScrollInterval);
    }
    
    // Start auto-scroll
    startAutoScroll();
    
    // Pause auto-scroll on hover
    slider.addEventListener('mouseenter', stopAutoScroll);
    slider.addEventListener('mouseleave', startAutoScroll);
    
    // Pause auto-scroll on touch
    slider.addEventListener('touchstart', stopAutoScroll);
    slider.addEventListener('touchend', () => {
        setTimeout(startAutoScroll, 2000);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const newCardsPerView = getCardsPerView();
        const newTotalSlides = Math.ceil(foodCards.length / newCardsPerView);
        updateDots(newTotalSlides);
        currentSlide = Math.min(currentSlide, newTotalSlides - 1);
        goToSlide(currentSlide);
    });
    
    // Add click effects to food cards
    foodCards.forEach(card => {
        card.addEventListener('click', function() {
            // Add a subtle animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Show notification
            const foodName = this.querySelector('h3').textContent;
            showNotification(`Learn to make ${foodName} with Khaana AI! 🍽️`, 'success');
        });
    });
}

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showNotification(message, type) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#C03527'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function addChatMessage(message, sender) {
    const chatMessages = document.querySelector('.chat-interface .chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('span');
    avatar.className = `${sender}-avatar`;
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add animation
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    setTimeout(() => {
        messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 100);
}
