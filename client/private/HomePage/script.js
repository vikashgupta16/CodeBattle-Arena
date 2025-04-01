function showNav() {
    const nav = document.querySelector('.codingPageNav');
    nav.style.display = 'flex';
    nav.classList.add('show');
    nav.classList.remove('hide');
    const slideBarOutsideIcon = document.querySelector('.outside-logo-sidebar');
    slideBarOutsideIcon.style.display = 'none';
}

function hideNav() {
    const nav = document.querySelector('.codingPageNav');
    nav.classList.add('hide');
    nav.classList.remove('show');
    // nav.style.display = 'none';
    const slideBarOutsideIcon = document.querySelector('.outside-logo-sidebar');
    slideBarOutsideIcon.style.display = 'flex';
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'flex';
    hideNav();
}

//   email 
function validate(){
    let name= document.querySelector(".name");
    let email= document.querySelector(".email");
    let msg= document.querySelector(".message");
    let sendBtn= document.querySelector(".send-btn");
    sendBtn.addEventListener('click',(e)=>{
        e.preventDefault();
        if(name.value == "" || email.value == "" || msg.value== ""){
            emptyerror();
        }else{
            sendmail (name.value, email.value, msg.value);
            success();
        }
    });

}
validate();
function sendmail(name,email,msg)
{
    emailjs.send("service_vikash__gupta","template_u8mh7fk",{
        from_name: email,
        to_name: name,
        message: msg,
        });
}
function emptyerror()
{
    swal({
        title: "Complete All The Sections",
        text: "Fields cant be empty",
        icon: "error",
      });
}
function success()
{
    swal({
        title: "Email Sent Succesfully",
        text: "We will Try To Rspond In 24 Hours",
        icon: "success",
      });
}

