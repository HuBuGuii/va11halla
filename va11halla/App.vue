<script>
export default {
  onLaunch: function () {
    console.log("App Launch");
  },
  onShow: function () {
    console.log("App Show");
  },
  onHide: function () {
    console.log("App Hide");
  },
};
</script>

<style>
/*每个页面公共css */
* {
  box-sizing: border-box;
}
html,
body {
  overflow: hidden;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
